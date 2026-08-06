-- =====================================================================
-- Advanced admin + Razorpay-ready architecture.
-- Additive only: preserves existing orders, products, users, images, and
-- historical manual-payment / Razorpay columns.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enum expansion
-- ---------------------------------------------------------------------
alter type public.order_status add value if not exists 'draft';
alter type public.order_status add value if not exists 'pending_payment';
alter type public.order_status add value if not exists 'payment_processing';
alter type public.order_status add value if not exists 'packed';
alter type public.order_status add value if not exists 'out_for_delivery';
alter type public.order_status add value if not exists 'return_requested';

alter type public.payment_status add value if not exists 'unpaid';
alter type public.payment_status add value if not exists 'authorised';
alter type public.payment_status add value if not exists 'captured';
alter type public.payment_status add value if not exists 'partially_refunded';
alter type public.payment_status add value if not exists 'disputed';

alter type public.payment_method add value if not exists 'upi';
alter type public.payment_method add value if not exists 'card';
alter type public.payment_method add value if not exists 'netbanking';
alter type public.payment_method add value if not exists 'wallet';
alter type public.payment_method add value if not exists 'emi';
alter type public.payment_method add value if not exists 'manual';

alter type public.coupon_type add value if not exists 'free_shipping';
alter type public.coupon_type add value if not exists 'product_discount';
alter type public.coupon_type add value if not exists 'category_discount';
alter type public.coupon_type add value if not exists 'first_order';
alter type public.coupon_type add value if not exists 'minimum_cart';

do $$ begin
  create type public.admin_role as enum (
    'owner',
    'admin',
    'operations',
    'inventory_manager',
    'support',
    'analyst',
    'viewer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_movement_type as enum (
    'adjustment',
    'reservation',
    'reservation_release',
    'sale_commit',
    'restock',
    'return',
    'correction'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_status as enum (
    'in_stock',
    'low_stock',
    'out_of_stock',
    'discontinued'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.refund_status as enum (
    'requested',
    'approved',
    'rejected',
    'processing',
    'processed',
    'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_status as enum (
    'active',
    'blocked',
    'guest',
    'high_value'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.loyalty_transaction_type as enum (
    'earned',
    'redeemed',
    'expired',
    'adjusted',
    'reversed'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Product and order additive columns
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists sku text,
  add column if not exists short_description text,
  add column if not exists subcategory text,
  add column if not exists product_type text,
  add column if not exists gender text,
  add column if not exists material text,
  add column if not exists colour text,
  add column if not exists size text,
  add column if not exists weight_grams numeric(10,2),
  add column if not exists jewellery_type text,
  add column if not exists cost_price numeric(10,2) check (cost_price is null or cost_price >= 0),
  add column if not exists tax_category text,
  add column if not exists reserved_stock int not null default 0 check (reserved_stock >= 0),
  add column if not exists low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  add column if not exists reorder_level int not null default 0 check (reorder_level >= 0),
  add column if not exists inventory_status public.inventory_status not null default 'in_stock',
  add column if not exists last_restocked_at timestamptz,
  add column if not exists last_sold_at timestamptz,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists search_keywords text[] not null default '{}',
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists return_eligible boolean not null default true,
  add column if not exists cod_eligible boolean not null default true,
  add column if not exists image_metadata jsonb not null default '[]'::jsonb;

create unique index if not exists products_sku_unique_idx
  on public.products(lower(sku))
  where sku is not null and btrim(sku) <> '';
create index if not exists products_active_idx on public.products(is_active);
create index if not exists products_inventory_status_idx on public.products(inventory_status);
create index if not exists products_available_stock_idx on public.products((stock_count - reserved_stock));

alter table public.orders
  add column if not exists gross_amount numeric(10,2),
  add column if not exists final_amount numeric(10,2),
  add column if not exists fulfilment_status text not null default 'unfulfilled',
  add column if not exists billing_address jsonb,
  add column if not exists customer_notes text,
  add column if not exists internal_notes text,
  add column if not exists shipment_tracking_number text,
  add column if not exists shipment_carrier text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists is_test boolean not null default false,
  add column if not exists is_archived boolean not null default false,
  add column if not exists data_classification text not null default 'genuine'
    check (data_classification in ('test', 'genuine', 'cancelled', 'archived')),
  add column if not exists stock_reserved_until timestamptz,
  add column if not exists inventory_committed_at timestamptz;

update public.orders
set gross_amount = coalesce(gross_amount, subtotal + discount),
    final_amount = coalesce(final_amount, total)
where gross_amount is null or final_amount is null;

alter table public.orders
  alter column gross_amount set default 0,
  alter column final_amount set default 0;

create index if not exists orders_fulfilment_status_idx on public.orders(fulfilment_status);
create index if not exists orders_payment_method_idx on public.orders(payment_method);
create index if not exists orders_data_classification_idx on public.orders(data_classification);
create index if not exists orders_is_test_idx on public.orders(is_test);

alter table public.order_items
  add column if not exists sku text,
  add column if not exists product_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists discount numeric(10,2) not null default 0 check (discount >= 0),
  add column if not exists tax numeric(10,2) not null default 0 check (tax >= 0);

-- ---------------------------------------------------------------------
-- Admin roles and audit
-- ---------------------------------------------------------------------
create table if not exists public.admin_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.admin_role not null default 'viewer',
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_profiles_role_idx on public.admin_profiles(role);
create index if not exists admin_profiles_active_idx on public.admin_profiles(is_active);

insert into public.admin_profiles(user_id, role, is_active)
select id, 'admin'::public.admin_role, true
from public.profiles
where is_admin = true
on conflict (user_id) do nothing;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_admin_idx on public.admin_audit_logs(admin_id);
create index if not exists admin_audit_logs_entity_idx on public.admin_audit_logs(entity, entity_id);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  email text,
  phone text,
  full_name text,
  status public.customer_status not null default 'guest',
  tags text[] not null default '{}',
  notes text,
  total_orders int not null default 0 check (total_orders >= 0),
  total_spent numeric(12,2) not null default 0 check (total_spent >= 0),
  average_order_value numeric(12,2) not null default 0 check (average_order_value >= 0),
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_email_idx on public.customers(lower(email));
create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists customers_status_idx on public.customers(status);
create index if not exists customers_last_order_idx on public.customers(last_order_at desc);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  profile_address_id uuid references public.addresses(id) on delete set null,
  type text not null default 'shipping' check (type in ('shipping', 'billing')),
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_customer_idx on public.customer_addresses(customer_id);

-- ---------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  provider text not null default 'mock',
  gateway text not null default 'razorpay',
  gateway_order_id text,
  gateway_payment_id text,
  amount_paise int not null check (amount_paise >= 0),
  currency text not null default 'INR',
  method text,
  status public.payment_status not null default 'pending',
  captured boolean not null default false,
  captured_at timestamptz,
  refund_amount_paise int not null default 0 check (refund_amount_paise >= 0),
  failure_code text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, gateway_payment_id)
);

create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_gateway_order_idx on public.payments(gateway_order_id);
create index if not exists payments_gateway_payment_idx on public.payments(gateway_payment_id);
create index if not exists payments_created_at_idx on public.payments(created_at desc);

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  provider text not null default 'mock',
  idempotency_key text not null,
  gateway_order_id text,
  amount_paise int not null check (amount_paise >= 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'pending',
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, idempotency_key)
);

create index if not exists payment_attempts_order_idx on public.payment_attempts(order_id);
create index if not exists payment_attempts_gateway_order_idx on public.payment_attempts(gateway_order_id);
create index if not exists payment_attempts_status_idx on public.payment_attempts(status);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processing_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, event_id)
);

create index if not exists payment_webhook_events_type_idx on public.payment_webhook_events(provider, event_type);
create index if not exists payment_webhook_events_processed_idx on public.payment_webhook_events(processed);
create index if not exists payment_webhook_events_created_at_idx on public.payment_webhook_events(created_at desc);

-- ---------------------------------------------------------------------
-- Refunds
-- ---------------------------------------------------------------------
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  requested_amount_paise int not null check (requested_amount_paise > 0),
  approved_amount_paise int check (approved_amount_paise is null or approved_amount_paise > 0),
  reason text not null,
  notes text,
  status public.refund_status not null default 'requested',
  gateway_refund_id text,
  requested_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(payment_id, idempotency_key)
);

create index if not exists refunds_order_idx on public.refunds(order_id);
create index if not exists refunds_payment_idx on public.refunds(payment_id);
create index if not exists refunds_status_idx on public.refunds(status);
create index if not exists refunds_created_at_idx on public.refunds(created_at desc);

-- ---------------------------------------------------------------------
-- Inventory
-- Stock rule:
--   - Reserve inventory for unpaid online attempts by increasing
--     products.reserved_stock.
--   - Release reservation after payment failure, cancellation, or expiry.
--   - Commit stock once a payment is webhook-confirmed/captured, or for COD
--     when the order is explicitly confirmed by an authorised admin.
--   - Legacy orders created before this migration may already have stock
--     decremented by create_order and are not reprocessed automatically.
-- ---------------------------------------------------------------------
create table if not exists public.inventory_movements (
  adjustment_id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  type public.inventory_movement_type not null,
  quantity_change int not null,
  previous_quantity int not null,
  new_quantity int not null,
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check (new_quantity >= 0)
);

create index if not exists inventory_movements_product_idx on public.inventory_movements(product_id);
create index if not exists inventory_movements_order_idx on public.inventory_movements(order_id);
create index if not exists inventory_movements_created_at_idx on public.inventory_movements(created_at desc);

-- ---------------------------------------------------------------------
-- Coupon usage, loyalty, notifications, settings, reviews
-- ---------------------------------------------------------------------
alter table public.coupons
  add column if not exists name text,
  add column if not exists maximum_discount numeric(10,2),
  add column if not exists minimum_order_value numeric(10,2),
  add column if not exists usage_limit_per_customer int,
  add column if not exists applicable_product_ids uuid[] not null default '{}',
  add column if not exists applicable_category_ids uuid[] not null default '{}',
  add column if not exists new_customers_only boolean not null default false,
  add column if not exists allow_stacking boolean not null default false;

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  created_at timestamptz not null default now(),
  unique(coupon_id, order_id)
);

create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions(coupon_id);
create index if not exists coupon_redemptions_customer_idx on public.coupon_redemptions(customer_id);

create table if not exists public.loyalty_accounts (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  points_balance int not null default 0 check (points_balance >= 0),
  lifetime_earned int not null default 0 check (lifetime_earned >= 0),
  lifetime_redeemed int not null default 0 check (lifetime_redeemed >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  transaction_type public.loyalty_transaction_type not null,
  points int not null,
  balance_after int not null check (balance_after >= 0),
  reason text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(customer_id, order_id, transaction_type)
);

create index if not exists loyalty_transactions_customer_idx on public.loyalty_transactions(customer_id);
create index if not exists loyalty_transactions_order_idx on public.loyalty_transactions(order_id);
create index if not exists loyalty_transactions_expires_idx on public.loyalty_transactions(expires_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null default 'admin' check (audience in ('admin', 'customer')),
  profile_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info',
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_idx on public.notifications(profile_id, read_at);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

create table if not exists public.store_settings (
  key text primary key,
  section text not null,
  value jsonb not null default '{}'::jsonb,
  is_secret boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_secret = false)
);

create index if not exists store_settings_section_idx on public.store_settings(section);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_reviews_product_idx on public.product_reviews(product_id);
create index if not exists product_reviews_status_idx on public.product_reviews(status);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'admin_profiles',
      'customers',
      'customer_addresses',
      'payments',
      'payment_attempts',
      'refunds',
      'loyalty_accounts',
      'store_settings',
      'product_reviews'
    ])
  loop
    execute format(
      'drop trigger if exists trg_%I_updated_at on public.%I; '
      'create trigger trg_%I_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at();',
      t, t, t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------
create or replace function public.has_admin_role()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select p.is_admin
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  )
  or exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.is_active = true
  );
$$;

create or replace function public.admin_has_permission(required_permission text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    join public.profiles p on p.id = ap.user_id
    where ap.user_id = auth.uid()
      and ap.is_active = true
      and (
        p.is_admin = true
        or ap.role in ('owner', 'admin')
        or required_permission = any(ap.permissions)
      )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  );
$$;

grant execute on function public.has_admin_role() to authenticated, anon;
grant execute on function public.admin_has_permission(text) to authenticated;

-- ---------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------
alter table public.admin_profiles enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.payments enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.refunds enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.store_settings enable row level security;
alter table public.product_reviews enable row level security;

drop policy if exists "admin_profiles_admin_all" on public.admin_profiles;
create policy "admin_profiles_admin_all"
  on public.admin_profiles for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "admin_audit_logs_admin_read" on public.admin_audit_logs;
create policy "admin_audit_logs_admin_read"
  on public.admin_audit_logs for select
  using (public.has_admin_role());

drop policy if exists "admin_audit_logs_admin_insert" on public.admin_audit_logs;
create policy "admin_audit_logs_admin_insert"
  on public.admin_audit_logs for insert
  with check (public.has_admin_role());

drop policy if exists "customers_admin_all" on public.customers;
create policy "customers_admin_all"
  on public.customers for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "customers_owner_select" on public.customers;
create policy "customers_owner_select"
  on public.customers for select
  using (profile_id = auth.uid());

drop policy if exists "customer_addresses_admin_all" on public.customer_addresses;
create policy "customer_addresses_admin_all"
  on public.customer_addresses for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "customer_addresses_owner_select" on public.customer_addresses;
create policy "customer_addresses_owner_select"
  on public.customer_addresses for select
  using (
    exists (
      select 1 from public.customers c
      where c.id = customer_addresses.customer_id
        and c.profile_id = auth.uid()
    )
  );

drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all"
  on public.payments for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "payments_owner_select" on public.payments;
create policy "payments_owner_select"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "payment_attempts_admin_all" on public.payment_attempts;
create policy "payment_attempts_admin_all"
  on public.payment_attempts for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "payment_attempts_owner_select" on public.payment_attempts;
create policy "payment_attempts_owner_select"
  on public.payment_attempts for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = payment_attempts.order_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "payment_webhook_events_admin_all" on public.payment_webhook_events;
create policy "payment_webhook_events_admin_all"
  on public.payment_webhook_events for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "refunds_admin_all" on public.refunds;
create policy "refunds_admin_all"
  on public.refunds for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "refunds_owner_select" on public.refunds;
create policy "refunds_owner_select"
  on public.refunds for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = refunds.order_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "inventory_movements_admin_all" on public.inventory_movements;
create policy "inventory_movements_admin_all"
  on public.inventory_movements for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "coupon_redemptions_admin_all" on public.coupon_redemptions;
create policy "coupon_redemptions_admin_all"
  on public.coupon_redemptions for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "loyalty_accounts_admin_all" on public.loyalty_accounts;
create policy "loyalty_accounts_admin_all"
  on public.loyalty_accounts for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "loyalty_accounts_owner_select" on public.loyalty_accounts;
create policy "loyalty_accounts_owner_select"
  on public.loyalty_accounts for select
  using (
    exists (
      select 1 from public.customers c
      where c.id = loyalty_accounts.customer_id
        and c.profile_id = auth.uid()
    )
  );

drop policy if exists "loyalty_transactions_admin_all" on public.loyalty_transactions;
create policy "loyalty_transactions_admin_all"
  on public.loyalty_transactions for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "loyalty_transactions_owner_select" on public.loyalty_transactions;
create policy "loyalty_transactions_owner_select"
  on public.loyalty_transactions for select
  using (
    exists (
      select 1 from public.customers c
      where c.id = loyalty_transactions.customer_id
        and c.profile_id = auth.uid()
    )
  );

drop policy if exists "notifications_admin_all" on public.notifications;
create policy "notifications_admin_all"
  on public.notifications for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

drop policy if exists "notifications_owner_select" on public.notifications;
create policy "notifications_owner_select"
  on public.notifications for select
  using (profile_id = auth.uid());

drop policy if exists "store_settings_admin_all" on public.store_settings;
create policy "store_settings_admin_all"
  on public.store_settings for all
  using (public.has_admin_role())
  with check (public.has_admin_role() and is_secret = false);

drop policy if exists "product_reviews_public_read" on public.product_reviews;
create policy "product_reviews_public_read"
  on public.product_reviews for select
  using (status = 'approved' or public.has_admin_role());

drop policy if exists "product_reviews_admin_all" on public.product_reviews;
create policy "product_reviews_admin_all"
  on public.product_reviews for all
  using (public.has_admin_role())
  with check (public.has_admin_role());

-- Keep old boolean helper compatible, but allow role-backed admins too.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_admin_role();
$$;

