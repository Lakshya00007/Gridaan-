-- =====================================================================
-- UPI redirect flow: create pending manual payment orders before opening
-- the customer's UPI app. References/UTRs are no longer collected during
-- checkout because admin verification is based on actual account credit.
-- =====================================================================

create or replace function public.create_order(
  p_user_id                  uuid,
  p_customer_name            text,
  p_customer_email           text,
  p_customer_phone           text,
  p_address                  jsonb,
  p_items                    jsonb,
  p_payment_method           payment_method,
  p_coupon_code              text default null,
  p_notes                    text default null,
  p_manual_payment_reference text default null,
  p_manual_payment_sender_name text default null,
  p_manual_payment_note      text default null
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
  if p_payment_method::text not in ('cod', 'manual_upi', 'bank_transfer') then
    raise exception 'Unsupported payment method';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

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
    v_subtotal := v_subtotal + v_line_total;
  end loop;

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
        raise exception 'Minimum order amount not met for this coupon';
      end if;
      if v_coupon.type = 'percentage' then
        v_discount := round((v_subtotal * v_coupon.value) / 100);
        if v_coupon.max_discount is not null and v_discount > v_coupon.max_discount then
          v_discount := v_coupon.max_discount;
        end if;
      else
        v_discount := v_coupon.value;
      end if;
      if v_discount > v_subtotal then
        v_discount := v_subtotal;
      end if;
    end if;
  end if;

  v_shipping := case when (v_subtotal - v_discount) >= v_threshold then 0 else v_ship_cost end;
  v_total := v_subtotal - v_discount + v_shipping + v_tax;

  insert into public.orders (
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    coupon_id,
    coupon_code,
    payment_method,
    payment_status,
    order_status,
    notes,
    manual_payment_reference,
    manual_payment_sender_name,
    manual_payment_note
  ) values (
    p_user_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_address,
    v_subtotal,
    v_discount,
    v_shipping,
    v_tax,
    v_total,
    v_coupon_id,
    p_coupon_code,
    p_payment_method,
    'pending'::payment_status,
    'placed'::order_status,
    p_notes,
    nullif(btrim(p_manual_payment_reference), ''),
    nullif(btrim(p_manual_payment_sender_name), ''),
    nullif(btrim(p_manual_payment_note), '')
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    v_line_total := v_product.price * (v_item->>'quantity')::int;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      unit_price,
      quantity,
      line_total
    ) values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.images[1],
      v_product.price,
      (v_item->>'quantity')::int,
      v_line_total
    );

    update public.products
    set stock_count = stock_count - (v_item->>'quantity')::int,
        in_stock = case
          when stock_count - (v_item->>'quantity')::int <= 0 then false
          else in_stock
        end
    where id = v_product.id;
  end loop;

  if v_coupon_id is not null then
    update public.coupons
    set usage_count = usage_count + 1
    where id = v_coupon_id;
  end if;

  insert into public.order_status_history (order_id, to_status, note)
  values (
    v_order_id,
    'placed',
    case
      when p_payment_method::text = 'manual_upi'
        then 'Order created; UPI payment pending manual verification'
      when p_payment_method::text = 'bank_transfer'
        then 'Order created; bank transfer pending manual verification'
      else 'Order created'
    end
  );

  return v_order_id;
end;
$$;

revoke execute on function public.create_order(
  uuid, text, text, text, jsonb, jsonb, payment_method, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_order(
  uuid, text, text, text, jsonb, jsonb, payment_method, text, text, text, text, text
) to service_role;

comment on function public.create_order is
  'Service-role only. Creates COD, UPI-intent, or bank-transfer orders after API validation; manual payments remain pending for admin verification.';
