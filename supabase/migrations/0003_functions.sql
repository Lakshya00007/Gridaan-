-- =====================================================================
-- 0003_functions.sql
-- Server-side functions used by API routes (security definer).
-- =====================================================================

-- Create an order, its items, and decrement stock atomically.
create or replace function public.create_order(
  p_user_id        uuid,
  p_customer_name  text,
  p_customer_email text,
  p_customer_phone text,
  p_address        jsonb,
  p_items          jsonb,           -- [{product_id, quantity, unit_price}]
  p_payment_method payment_method,
  p_coupon_code    text default null,
  p_notes          text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id   uuid;
  v_subtotal   numeric(10,2) := 0;
  v_discount   numeric(10,2) := 0;
  v_shipping   numeric(10,2) := 0;
  v_total      numeric(10,2) := 0;
  v_coupon_id  uuid;
  v_coupon     public.coupons%rowtype;
  v_tax        numeric(10,2) := 0;
  v_item       jsonb;
  v_product    public.products%rowtype;
  v_line_total numeric(10,2);
  v_threshold  numeric(10,2) := 999;
  v_ship_cost  numeric(10,2) := 79;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  -- Compute subtotal and validate stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
    for update;

    if not found then
      raise exception 'Product % not found', v_item->>'product_id';
    end if;
    if v_product.stock_count < (v_item->>'quantity')::int then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    v_line_total := v_product.price * (v_item->>'quantity')::int;
    v_subtotal   := v_subtotal + v_line_total;
  end loop;

  -- Apply coupon
  if p_coupon_code is not null then
    select * into v_coupon
    from public.coupons
    where upper(code) = upper(p_coupon_code)
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
      and (usage_limit is null or usage_count < usage_limit)
    limit 1;

    if found then
      v_coupon_id := v_coupon.id;
      if v_subtotal < v_coupon.min_order then
        raise exception 'Minimum order ₹% required for this coupon', v_coupon.min_order;
      end if;
      if v_coupon.type = 'percentage' then
        v_discount := round((v_subtotal * v_coupon.value) / 100);
        if v_coupon.max_discount is not null and v_discount > v_coupon.max_discount then
          v_discount := v_coupon.max_discount;
        end if;
      else
        v_discount := v_coupon.value;
      end if;
      if v_discount > v_subtotal then v_discount := v_subtotal; end if;
    end if;
  end if;

  v_shipping := case when (v_subtotal - v_discount) >= v_threshold then 0 else v_ship_cost end;
  v_total    := v_subtotal - v_discount + v_shipping + v_tax;

  -- Create order
  insert into public.orders (
    user_id, customer_name, customer_email, customer_phone,
    shipping_address, subtotal, discount, shipping, tax, total,
    coupon_id, coupon_code, payment_method, payment_status, order_status, notes
  ) values (
    p_user_id, p_customer_name, p_customer_email, p_customer_phone,
    p_address, v_subtotal, v_discount, v_shipping, v_tax, v_total,
    v_coupon_id, p_coupon_code, p_payment_method,
    case when p_payment_method = 'cod' then 'pending'::payment_status else 'pending'::payment_status end,
    'placed'::order_status, p_notes
  )
  returning id into v_order_id;

  -- Insert order items + decrement stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    v_line_total := v_product.price * (v_item->>'quantity')::int;

    insert into public.order_items (
      order_id, product_id, product_name, product_image,
      unit_price, quantity, line_total
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.images[1],
      v_product.price, (v_item->>'quantity')::int, v_line_total
    );

    update public.products
    set stock_count = stock_count - (v_item->>'quantity')::int,
        in_stock    = case when stock_count - (v_item->>'quantity')::int <= 0 then false else in_stock end
    where id = v_product.id;
  end loop;

  -- Increment coupon usage
  if v_coupon_id is not null then
    update public.coupons set usage_count = usage_count + 1 where id = v_coupon_id;
  end if;

  -- Status history
  insert into public.order_status_history (order_id, to_status, note)
  values (v_order_id, 'placed', 'Order created');

  return v_order_id;
end;
$$;

grant execute on function public.create_order(
  uuid, text, text, text, jsonb, jsonb, payment_method, text, text
) to authenticated, anon;

-- Mark order paid (after Razorpay verification)
create or replace function public.mark_order_paid(
  p_order_id        uuid,
  p_razorpay_order_id   text,
  p_razorpay_payment_id text,
  p_razorpay_signature  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set payment_status     = 'paid',
      razorpay_order_id   = p_razorpay_order_id,
      razorpay_payment_id = p_razorpay_payment_id,
      razorpay_signature  = p_razorpay_signature
  where id = p_order_id and payment_status = 'pending';
end;
$$;

grant execute on function public.mark_order_paid(uuid, text, text, text)
  to authenticated, anon;

-- Update order status (admin)
create or replace function public.update_order_status(
  p_order_id  uuid,
  p_to_status order_status,
  p_note      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_from order_status;
begin
  select order_status into v_from from public.orders where id = p_order_id for update;
  update public.orders set order_status = p_to_status where id = p_order_id;
  insert into public.order_status_history(order_id, from_status, to_status, note)
  values (p_order_id, v_from, p_to_status, p_note);
end;
$$;

grant execute on function public.update_order_status(uuid, order_status, text)
  to authenticated;

-- Validate coupon (returns JSON describing whether it can be applied)
create or replace function public.validate_coupon(
  p_code   text,
  p_subtotal numeric(10,2)
)
returns table (
  ok          boolean,
  reason      text,
  coupon_id   uuid,
  coupon_code text,
  discount    numeric(10,2)
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare v public.coupons%rowtype; v_discount numeric(10,2);
begin
  select * into v from public.coupons
  where upper(code) = upper(p_code)
    and is_active = true
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at >= now())
    and (usage_limit is null or usage_count < usage_limit)
  limit 1;

  if not found then
    ok := false; reason := 'Invalid or expired coupon code';
    return next; return;
  end if;
  if p_subtotal < v.min_order then
    ok := false; reason := format('Minimum order ₹%s required', v.min_order);
    return next; return;
  end if;
  if v.type = 'percentage' then
    v_discount := round((p_subtotal * v.value) / 100);
    if v.max_discount is not null and v_discount > v.max_discount then
      v_discount := v.max_discount;
    end if;
  else
    v_discount := v.value;
  end if;
  if v_discount > p_subtotal then v_discount := p_subtotal; end if;
  ok := true; reason := 'Coupon applied';
  coupon_id := v.id; coupon_code := v.code; discount := v_discount;
  return next;
end;
$$;

grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;
