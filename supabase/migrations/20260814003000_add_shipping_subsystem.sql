-- =====================================================================
-- NimbusPost-ready shipping subsystem.
-- Additive only: payment and shipping remain separate state machines.
-- No provider credentials are stored in the database.
-- =====================================================================

create extension if not exists "pgcrypto";

do $$ begin
  create type public.shipment_provider as enum (
    'nimbuspost'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shipment_status as enum (
    'not_created',
    'ready_to_ship',
    'booking_in_progress',
    'booking_uncertain',
    'booking_failed',
    'booked',
    'pickup_scheduled',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'delivery_exception',
    'ndr',
    'rto_initiated',
    'rto_in_transit',
    'rto_delivered',
    'cancelled',
    'lost'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider public.shipment_provider not null,
  direction text not null default 'outbound' check (direction in ('outbound', 'reverse')),
  provider_shipment_id text,
  provider_order_id text,
  provider_reference text,
  local_idempotency_key text not null,
  awb text,
  courier_id text,
  courier_name text,
  status public.shipment_status not null default 'ready_to_ship',
  raw_status text,
  tracking_url text,
  label_url text,
  label_reference text,
  pickup_reference text,
  pickup_status text,
  package_weight_grams numeric(10,2),
  package_length_cm numeric(10,2),
  package_width_cm numeric(10,2),
  package_height_cm numeric(10,2),
  charged_carrier_cost numeric(10,2),
  customer_shipping_amount numeric(10,2),
  rto_carrier_cost numeric(10,2),
  currency text not null default 'INR',
  estimated_delivery_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  provider_metadata jsonb not null default '{}'::jsonb,
  last_error_code text,
  last_error_message text,
  last_error_request_id text,
  booked_at timestamptz,
  pickup_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  rto_initiated_at timestamptz,
  rto_delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (package_weight_grams is null or package_weight_grams > 0),
  check (package_length_cm is null or package_length_cm > 0),
  check (package_width_cm is null or package_width_cm > 0),
  check (package_height_cm is null or package_height_cm > 0),
  check (charged_carrier_cost is null or charged_carrier_cost >= 0),
  check (customer_shipping_amount is null or customer_shipping_amount >= 0),
  check (rto_carrier_cost is null or rto_carrier_cost >= 0),
  check (currency = 'INR')
);

create index if not exists shipments_order_idx on public.shipments(order_id);
create index if not exists shipments_provider_status_idx on public.shipments(provider, status);
create index if not exists shipments_created_at_idx on public.shipments(created_at desc);
create index if not exists shipments_awb_idx on public.shipments(awb) where awb is not null;

create unique index if not exists shipments_provider_shipment_unique_idx
  on public.shipments(provider, provider_shipment_id)
  where provider_shipment_id is not null;

create unique index if not exists shipments_provider_order_unique_idx
  on public.shipments(provider, provider_order_id)
  where provider_order_id is not null;

create unique index if not exists shipments_awb_unique_idx
  on public.shipments(provider, awb)
  where awb is not null;

create unique index if not exists shipments_local_idempotency_unique_idx
  on public.shipments(provider, local_idempotency_key);

create unique index if not exists shipments_one_active_outbound_per_order_idx
  on public.shipments(order_id)
  where direction = 'outbound'
    and cancelled_at is null
    and status not in ('delivered', 'cancelled', 'rto_delivered', 'lost');

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  provider public.shipment_provider not null,
  provider_event_id text,
  canonical_status public.shipment_status,
  raw_status text,
  event_payload jsonb not null default '{}'::jsonb,
  provider_occurred_at timestamptz,
  received_at timestamptz not null default now(),
  payload_hash text
);

create index if not exists shipment_events_shipment_idx on public.shipment_events(shipment_id);
create index if not exists shipment_events_received_at_idx on public.shipment_events(received_at desc);
create index if not exists shipment_events_status_idx on public.shipment_events(canonical_status);

create unique index if not exists shipment_events_provider_event_unique_idx
  on public.shipment_events(provider, provider_event_id)
  where provider_event_id is not null;

create unique index if not exists shipment_events_payload_hash_unique_idx
  on public.shipment_events(shipment_id, payload_hash)
  where payload_hash is not null;

drop trigger if exists trg_shipments_updated_at on public.shipments;
create trigger trg_shipments_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;

revoke all on public.shipments from anon, authenticated;
revoke all on public.shipment_events from anon, authenticated;

grant select, insert, update on public.shipments to service_role;
grant select, insert, update on public.shipment_events to service_role;

comment on table public.shipments is
  'Outbound and future reverse shipment records. Payment state is never changed by this table.';
comment on table public.shipment_events is
  'Idempotent provider tracking/webhook events. Payloads must be safe and must not contain credentials.';
comment on column public.shipments.customer_shipping_amount is
  'Amount Gridaan charged the customer for shipping at checkout.';
comment on column public.shipments.charged_carrier_cost is
  'Actual carrier/provider shipping cost when returned by NimbusPost.';
comment on column public.shipments.provider_metadata is
  'Safe provider metadata only. Never store API keys, tokens, passwords, or authorization headers.';

create or replace function public.begin_outbound_shipment_creation(
  p_order_id uuid,
  p_provider public.shipment_provider,
  p_local_idempotency_key text,
  p_created_by uuid,
  p_package_weight_grams numeric,
  p_package_length_cm numeric,
  p_package_width_cm numeric,
  p_package_height_cm numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_existing public.shipments%rowtype;
  v_shipment_id uuid;
begin
  if p_provider <> 'nimbuspost'::public.shipment_provider then
    raise exception 'Unsupported shipping provider';
  end if;

  if nullif(btrim(p_local_idempotency_key), '') is null then
    raise exception 'Shipment idempotency key is required';
  end if;

  if p_package_weight_grams <= 0
    or p_package_length_cm <= 0
    or p_package_width_cm <= 0
    or p_package_height_cm <= 0
  then
    raise exception 'Package weight and dimensions must be positive';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.payment_method <> 'razorpay'::public.payment_method
    or v_order.payment_status <> 'captured'::public.payment_status
  then
    raise exception 'Shipment requires captured Razorpay payment';
  end if;

  if v_order.order_status in (
    'draft'::public.order_status,
    'pending_payment'::public.order_status,
    'payment_processing'::public.order_status,
    'cancelled'::public.order_status,
    'returned'::public.order_status
  ) then
    raise exception 'Order status is not shippable';
  end if;

  select * into v_existing
  from public.shipments
  where order_id = p_order_id
    and direction = 'outbound'
    and cancelled_at is null
    and status not in ('delivered', 'cancelled', 'rto_delivered', 'lost')
  for update;

  if found then
    if v_existing.local_idempotency_key = p_local_idempotency_key then
      return v_existing.id;
    end if;
    raise exception 'Active outbound shipment already exists for this order';
  end if;

  insert into public.shipments (
    order_id,
    provider,
    direction,
    local_idempotency_key,
    status,
    package_weight_grams,
    package_length_cm,
    package_width_cm,
    package_height_cm,
    customer_shipping_amount,
    created_by,
    metadata
  )
  values (
    p_order_id,
    p_provider,
    'outbound',
    p_local_idempotency_key,
    'ready_to_ship',
    p_package_weight_grams,
    p_package_length_cm,
    p_package_width_cm,
    p_package_height_cm,
    v_order.shipping,
    p_created_by,
    jsonb_build_object('created_from', 'admin_packing_step')
  )
  returning id into v_shipment_id;

  return v_shipment_id;
end;
$$;

revoke execute on function public.begin_outbound_shipment_creation(
  uuid,
  public.shipment_provider,
  text,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric
) from public, anon, authenticated;

grant execute on function public.begin_outbound_shipment_creation(
  uuid,
  public.shipment_provider,
  text,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric
) to service_role;

comment on function public.begin_outbound_shipment_creation is
  'Service-role only. Locks the paid order and prevents duplicate active outbound shipments before any provider booking.';
