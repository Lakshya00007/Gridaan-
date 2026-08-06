-- Online-payment-only checkout readiness.
-- Pending checkout records may exist before successful Razorpay payment, but
-- public order numbers are assigned only after verified captured payment.

alter table public.orders
  alter column order_number drop default,
  alter column order_number drop not null;

alter table public.orders
  add column if not exists checkout_reference text,
  add column if not exists finalised_at timestamptz,
  add column if not exists reservation_released_at timestamptz,
  add column if not exists payment_failure_reason text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists orders_checkout_reference_key
  on public.orders(checkout_reference)
  where checkout_reference is not null;

create index if not exists orders_pending_payment_idx
  on public.orders(order_status, payment_status, stock_reserved_until)
  where order_status in ('pending_payment', 'payment_processing');

create or replace function public.generate_gridaan_order_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'GR-' || lpad(nextval('public.order_number_seq')::text, 8, '0');
$$;

grant execute on function public.generate_gridaan_order_number() to service_role;

create or replace function public.reserve_product_stock(
  p_product_id uuid,
  p_order_id uuid,
  p_quantity int,
  p_reason text default 'Online payment stock reservation'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_available int;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  v_available := greatest(0, v_product.stock_count - coalesce(v_product.reserved_stock, 0));
  if v_product.in_stock is not true or v_available < p_quantity then
    raise exception 'Insufficient available stock';
  end if;

  update public.products
  set reserved_stock = coalesce(reserved_stock, 0) + p_quantity,
      updated_at = now()
  where id = p_product_id;

  insert into public.inventory_movements(
    product_id,
    order_id,
    type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reason,
    metadata
  )
  values (
    p_product_id,
    p_order_id,
    'reservation',
    p_quantity,
    coalesce(v_product.reserved_stock, 0),
    coalesce(v_product.reserved_stock, 0) + p_quantity,
    p_reason,
    jsonb_build_object('stock_count', v_product.stock_count)
  );

  return jsonb_build_object(
    'stock', v_product.stock_count,
    'reserved', coalesce(v_product.reserved_stock, 0) + p_quantity,
    'available', v_available - p_quantity
  );
end;
$$;

grant execute on function public.reserve_product_stock(uuid, uuid, int, text) to service_role;

create or replace function public.release_order_reservation(
  p_order_id uuid,
  p_reason text default 'Online payment reservation released'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_previous_reserved int;
begin
  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    select coalesce(reserved_stock, 0)
      into v_previous_reserved
    from public.products
    where id = v_item.product_id
    for update;

    update public.products
    set reserved_stock = greatest(0, coalesce(reserved_stock, 0) - v_item.quantity),
        updated_at = now()
    where id = v_item.product_id;

    insert into public.inventory_movements(
      product_id,
      order_id,
      type,
      quantity_change,
      previous_quantity,
      new_quantity,
      reason
    )
    values (
      v_item.product_id,
      p_order_id,
      'reservation_release',
      -v_item.quantity,
      v_previous_reserved,
      greatest(0, v_previous_reserved - v_item.quantity),
      p_reason
    );
  end loop;

  update public.orders
  set reservation_released_at = coalesce(reservation_released_at, now()),
      stock_reserved_until = null,
      updated_at = now()
  where id = p_order_id;
end;
$$;

grant execute on function public.release_order_reservation(uuid, text) to service_role;

create or replace function public.commit_order_inventory(
  p_order_id uuid,
  p_reason text default 'Captured online payment sale commit'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_product public.products%rowtype;
begin
  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if not found then
      raise exception 'Product not found while committing inventory';
    end if;

    if coalesce(v_product.reserved_stock, 0) < v_item.quantity then
      raise exception 'Reserved stock is lower than order quantity';
    end if;

    if v_product.stock_count < v_item.quantity then
      raise exception 'Stock cannot be reduced below zero';
    end if;

    update public.products
    set stock_count = stock_count - v_item.quantity,
        reserved_stock = coalesce(reserved_stock, 0) - v_item.quantity,
        in_stock = (stock_count - v_item.quantity) > 0,
        inventory_status = case
          when stock_count - v_item.quantity <= 0 then 'out_of_stock'::public.inventory_status
          when stock_count - v_item.quantity - (coalesce(reserved_stock, 0) - v_item.quantity) <= coalesce(low_stock_threshold, 5) then 'low_stock'::public.inventory_status
          else 'in_stock'::public.inventory_status
        end,
        last_sold_at = now(),
        updated_at = now()
    where id = v_item.product_id;

    insert into public.inventory_movements(
      product_id,
      order_id,
      type,
      quantity_change,
      previous_quantity,
      new_quantity,
      reason,
      metadata
    )
    values (
      v_item.product_id,
      p_order_id,
      'sale_commit',
      -v_item.quantity,
      v_product.stock_count,
      v_product.stock_count - v_item.quantity,
      p_reason,
      jsonb_build_object(
        'previous_reserved_stock', coalesce(v_product.reserved_stock, 0),
        'new_reserved_stock', coalesce(v_product.reserved_stock, 0) - v_item.quantity
      )
    );
  end loop;
end;
$$;

grant execute on function public.commit_order_inventory(uuid, text) to service_role;
