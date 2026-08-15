-- =====================================================================
-- Meta conversion analytics outbox.
-- Additive only. Does not affect checkout, payment capture, inventory,
-- shipping, refunds, or order status transitions.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.meta_conversion_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_name text not null check (event_name in ('Purchase')),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  event_time bigint not null check (event_time > 0),
  attempt_count int not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  processing_started_at timestamptz,
  claim_id uuid,
  sent_at timestamptz,
  safe_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meta_conversion_events_order_idx
  on public.meta_conversion_events(order_id);
create index if not exists meta_conversion_events_status_idx
  on public.meta_conversion_events(status);
create index if not exists meta_conversion_events_processing_idx
  on public.meta_conversion_events(status, processing_started_at)
  where status = 'processing';
create index if not exists meta_conversion_events_created_at_idx
  on public.meta_conversion_events(created_at desc);

drop trigger if exists trg_meta_conversion_events_updated_at on public.meta_conversion_events;
create trigger trg_meta_conversion_events_updated_at
  before update on public.meta_conversion_events
  for each row execute function public.set_updated_at();

create or replace function public.prevent_meta_conversion_sent_regression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'sent' and new.status <> 'sent' then
    raise exception 'sent Meta conversion events are terminal';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_meta_conversion_events_sent_terminal on public.meta_conversion_events;
create trigger trg_meta_conversion_events_sent_terminal
  before update on public.meta_conversion_events
  for each row execute function public.prevent_meta_conversion_sent_regression();

alter table public.meta_conversion_events enable row level security;

revoke all on public.meta_conversion_events from anon, authenticated;
grant select, insert, update on public.meta_conversion_events to service_role;

create or replace function public.claim_meta_conversion_event(
  p_event_id text,
  p_event_name text,
  p_order_id uuid,
  p_event_time bigint,
  p_lease_seconds int default 600
)
returns table (
  id uuid,
  event_id text,
  event_name text,
  order_id uuid,
  status text,
  attempt_count int,
  event_time bigint,
  claim_id uuid,
  claim_result text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_claim_id uuid := gen_random_uuid();
  v_rows int := 0;
begin
  if p_event_time is null or p_event_time <= 0 then
    raise exception 'event_time must be a positive unix timestamp';
  end if;

  insert into public.meta_conversion_events (
    event_id,
    event_name,
    order_id,
    status,
    event_time
  )
  values (
    p_event_id,
    p_event_name,
    p_order_id,
    'pending',
    p_event_time
  )
  on conflict (event_id) do nothing;

  return query
  with claimed as (
    update public.meta_conversion_events e
       set status = 'processing',
           attempt_count = e.attempt_count + 1,
           last_attempt_at = v_now,
           processing_started_at = v_now,
           claim_id = v_claim_id,
           event_time = coalesce(e.event_time, p_event_time),
           safe_error_code = null,
           updated_at = v_now
     where e.event_id = p_event_id
       and (
         e.status in ('pending', 'failed')
         or (
           e.status = 'processing'
           and (
             e.processing_started_at is null
             or e.processing_started_at <= v_now - make_interval(secs => p_lease_seconds)
           )
         )
       )
     returning e.*
  )
  select
    claimed.id,
    claimed.event_id,
    claimed.event_name,
    claimed.order_id,
    claimed.status,
    claimed.attempt_count,
    claimed.event_time,
    claimed.claim_id,
    'claimed'::text
  from claimed;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    return;
  end if;

  return query
  select
    e.id,
    e.event_id,
    e.event_name,
    e.order_id,
    e.status,
    e.attempt_count,
    e.event_time,
    e.claim_id,
    case
      when e.status = 'sent' then 'already_sent'
      when e.status = 'processing' then 'already_claimed'
      when e.status = 'skipped' then 'skipped'
      else 'not_claimed'
    end::text
  from public.meta_conversion_events e
  where e.event_id = p_event_id;
end;
$$;

create or replace function public.skip_meta_conversion_event(
  p_event_id text,
  p_event_name text,
  p_order_id uuid,
  p_event_time bigint,
  p_safe_error_code text,
  p_lease_seconds int default 600
)
returns table (
  id uuid,
  event_id text,
  event_name text,
  order_id uuid,
  status text,
  attempt_count int,
  event_time bigint,
  claim_id uuid,
  skip_result text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_rows int := 0;
begin
  if p_event_time is null or p_event_time <= 0 then
    raise exception 'event_time must be a positive unix timestamp';
  end if;

  insert into public.meta_conversion_events (
    event_id,
    event_name,
    order_id,
    status,
    event_time,
    safe_error_code
  )
  values (
    p_event_id,
    p_event_name,
    p_order_id,
    'skipped',
    p_event_time,
    p_safe_error_code
  )
  on conflict (event_id) do nothing;

  return query
  with skipped as (
    update public.meta_conversion_events e
       set status = 'skipped',
           claim_id = null,
           processing_started_at = null,
           safe_error_code = p_safe_error_code,
           event_time = coalesce(e.event_time, p_event_time),
           updated_at = v_now
     where e.event_id = p_event_id
       and (
         e.status in ('pending', 'failed', 'skipped')
         or (
           e.status = 'processing'
           and (
             e.processing_started_at is null
             or e.processing_started_at <= v_now - make_interval(secs => p_lease_seconds)
           )
         )
       )
       and e.status <> 'sent'
     returning e.*
  )
  select
    skipped.id,
    skipped.event_id,
    skipped.event_name,
    skipped.order_id,
    skipped.status,
    skipped.attempt_count,
    skipped.event_time,
    skipped.claim_id,
    'skipped'::text
  from skipped;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    return;
  end if;

  return query
  select
    e.id,
    e.event_id,
    e.event_name,
    e.order_id,
    e.status,
    e.attempt_count,
    e.event_time,
    e.claim_id,
    case
      when e.status = 'sent' then 'already_sent'
      when e.status = 'processing' then 'already_claimed'
      else e.status
    end::text
  from public.meta_conversion_events e
  where e.event_id = p_event_id;
end;
$$;

revoke all on function public.claim_meta_conversion_event(text, text, uuid, bigint, int)
  from public, anon, authenticated;
revoke all on function public.skip_meta_conversion_event(text, text, uuid, bigint, text, int)
  from public, anon, authenticated;
grant execute on function public.claim_meta_conversion_event(text, text, uuid, bigint, int)
  to service_role;
grant execute on function public.skip_meta_conversion_event(text, text, uuid, bigint, text, int)
  to service_role;
revoke all on function public.prevent_meta_conversion_sent_regression()
  from public, anon, authenticated;

comment on table public.meta_conversion_events is
  'Server-only outbox for Meta CAPI Purchase dedup/retry. Does not store access tokens or full Meta payloads.';
comment on column public.meta_conversion_events.event_id is
  'Deterministic event ID shared by browser Pixel and server CAPI, e.g. purchase:GR-00000001.';
comment on column public.meta_conversion_events.event_time is
  'Stable Unix timestamp in seconds for when the purchase capture occurred. Retries must reuse this value.';
comment on column public.meta_conversion_events.claim_id is
  'Ephemeral lease token for one server-side CAPI send attempt. Prevents stale workers from completing a stolen claim.';
comment on column public.meta_conversion_events.safe_error_code is
  'Sanitized operational error code only. Never store Meta access tokens or raw customer matching data.';
