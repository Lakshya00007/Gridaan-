-- Harden online checkout inventory operations against retries and concurrent
-- payment callbacks. The application now uses the existing order_items.sku
-- and order_items.tax columns, so no duplicate snapshot columns are needed.

create index if not exists inventory_movements_order_product_type_idx
  on public.inventory_movements(order_id, product_id, type)
  where order_id is not null;

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
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_available int;
  v_active_reservation int;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.inventory_committed_at is not null
     or v_order.payment_status::text in ('captured', 'paid')
     or v_order.order_status::text = 'placed' then
    raise exception 'Inventory is already committed for this order';
  end if;

  select coalesce(sum(quantity_change), 0)::int
    into v_active_reservation
  from public.inventory_movements
  where order_id = p_order_id
    and product_id = p_product_id
    and type in (
      'reservation'::public.inventory_movement_type,
      'reservation_release'::public.inventory_movement_type
    );

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  if v_active_reservation > 0 then
    if v_active_reservation <> p_quantity then
      raise exception 'Existing reservation quantity does not match checkout quantity';
    end if;

    return jsonb_build_object(
      'stock', v_product.stock_count,
      'reserved', coalesce(v_product.reserved_stock, 0),
      'available', greatest(0, v_product.stock_count - coalesce(v_product.reserved_stock, 0)),
      'reused', true
    );
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

  update public.orders
  set reservation_released_at = null,
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'stock', v_product.stock_count,
    'reserved', coalesce(v_product.reserved_stock, 0) + p_quantity,
    'available', v_available - p_quantity,
    'reused', false
  );
end;
$$;

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
  v_order public.orders%rowtype;
  v_item record;
  v_previous_reserved int;
  v_active_reservation int;
  v_release_quantity int;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.inventory_committed_at is not null
     or v_order.reservation_released_at is not null then
    return;
  end if;

  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    select coalesce(sum(quantity_change), 0)::int
      into v_active_reservation
    from public.inventory_movements
    where order_id = p_order_id
      and product_id = v_item.product_id
      and type in (
        'reservation'::public.inventory_movement_type,
        'reservation_release'::public.inventory_movement_type
      );

    if v_active_reservation <= 0 then
      continue;
    end if;

    select coalesce(reserved_stock, 0)
      into v_previous_reserved
    from public.products
    where id = v_item.product_id
    for update;

    if not found then
      raise exception 'Product not found while releasing inventory';
    end if;

    v_release_quantity := least(v_active_reservation, v_previous_reserved);
    if v_release_quantity <= 0 then
      continue;
    end if;

    update public.products
    set reserved_stock = v_previous_reserved - v_release_quantity,
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
      -v_release_quantity,
      v_previous_reserved,
      v_previous_reserved - v_release_quantity,
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
  v_order public.orders%rowtype;
  v_item record;
  v_product public.products%rowtype;
  v_active_reservation int;
  v_committed_at timestamptz := now();
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.inventory_committed_at is not null then
    return;
  end if;

  if not exists (
    select 1
    from public.payments
    where order_id = p_order_id
      and captured is true
      and status::text = 'captured'
  ) then
    raise exception 'Captured payment is required before inventory commit';
  end if;

  if not exists (
    select 1
    from public.order_items
    where order_id = p_order_id
  ) then
    raise exception 'Order items are required before inventory commit';
  end if;

  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    select coalesce(sum(quantity_change), 0)::int
      into v_active_reservation
    from public.inventory_movements
    where order_id = p_order_id
      and product_id = v_item.product_id
      and type in (
        'reservation'::public.inventory_movement_type,
        'reservation_release'::public.inventory_movement_type
      );

    if v_active_reservation < v_item.quantity then
      raise exception 'Reserved stock is lower than order quantity';
    end if;

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
          when stock_count - v_item.quantity
               - (coalesce(reserved_stock, 0) - v_item.quantity)
               <= coalesce(low_stock_threshold, 5)
            then 'low_stock'::public.inventory_status
          else 'in_stock'::public.inventory_status
        end,
        last_sold_at = v_committed_at,
        updated_at = v_committed_at
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

  update public.orders
  set inventory_committed_at = v_committed_at,
      stock_reserved_until = null,
      reservation_released_at = null,
      updated_at = v_committed_at
  where id = p_order_id;
end;
$$;

grant execute on function public.reserve_product_stock(uuid, uuid, int, text) to service_role;
grant execute on function public.release_order_reservation(uuid, text) to service_role;
grant execute on function public.commit_order_inventory(uuid, text) to service_role;

notify pgrst, 'reload schema';
