-- Add the missing discount snapshot required by checkout.

alter table public.order_items
  add column if not exists discount_amount numeric(12, 2) not null default 0;

comment on column public.order_items.discount_amount is
  'Discount allocated to this order line, stored in INR.';

notify pgrst, 'reload schema';
