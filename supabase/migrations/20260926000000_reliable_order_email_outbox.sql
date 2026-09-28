-- Keep transactional email intent in the same transaction as order state.
-- Requires 20260923000000_add_order_email_events.sql.
alter table public.orders add column if not exists cancelled_at timestamptz;

alter table public.order_email_events
  add column if not exists attempt_count integer not null default 0,
  add column if not exists processing_started_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists claim_id uuid,
  add column if not exists payload jsonb;

-- Old failed rows did not use a stable provider idempotency key. Their
-- provider outcome may be ambiguous, so require manual review instead of
-- automatically retrying them with a new key.
update public.order_email_events
   set last_attempt_at = now() - interval '25 hours'
 where status = 'failed' and last_attempt_at is null;

update public.order_email_events
   set status = 'failed',
       attempt_count = 1,
       last_attempt_at = now() - interval '25 hours',
       error = 'Legacy pending attempt: provider outcome requires manual review'
 where status = 'pending' and last_attempt_at is null;

alter table public.order_email_events
  drop constraint if exists order_email_events_status_check;
alter table public.order_email_events
  add constraint order_email_events_status_check
  check (status in ('pending', 'processing', 'sent', 'failed'));

create index if not exists order_email_events_retry_idx
  on public.order_email_events (status, last_attempt_at, created_at)
  where status in ('pending', 'failed', 'processing');

create or replace function public.enqueue_order_email_events()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.payment_status = 'captured' and new.order_status = 'placed' then
      insert into public.order_email_events (order_id, event_type)
        values (new.id, 'order_confirmation'), (new.id, 'admin_new_order')
        on conflict (order_id, event_type) do nothing;
    end if;
    return new;
  end if;

  if new.payment_status = 'captured'
     and new.order_status = 'placed'
     and (old.payment_status is distinct from 'captured'
          or old.order_status is distinct from 'placed') then
    insert into public.order_email_events (order_id, event_type)
      values (new.id, 'order_confirmation'), (new.id, 'admin_new_order')
      on conflict (order_id, event_type) do nothing;
  end if;

  if new.order_status is distinct from old.order_status then
    if new.order_status in ('shipped', 'delivered', 'cancelled') then
      insert into public.order_email_events (order_id, event_type)
        values (new.id, 'order_' || new.order_status::text)
        on conflict (order_id, event_type) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enqueue_order_emails on public.orders;
create trigger trg_enqueue_order_emails
  after insert or update of payment_status, order_status on public.orders
  for each row execute function public.enqueue_order_email_events();

create or replace function public.claim_order_email_event(
  p_order_id uuid,
  p_event_type text,
  p_lease_seconds integer default 600
)
returns table (
  id uuid,
  claim_id uuid,
  attempt_count integer,
  payload jsonb,
  claim_result text
)
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := now();
  v_claim_id uuid := gen_random_uuid();
begin
  if p_event_type not in ('order_confirmation', 'order_shipped', 'order_delivered', 'order_cancelled', 'admin_new_order') then
    raise exception 'Unsupported order email event';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 3600 then
    raise exception 'Invalid email lease';
  end if;

  insert into public.order_email_events (order_id, event_type)
    values (p_order_id, p_event_type)
    on conflict (order_id, event_type) do nothing;

  return query
  with claimed as (
    update public.order_email_events e
       set status = 'processing',
           claim_id = v_claim_id,
           processing_started_at = v_now,
           last_attempt_at = v_now,
           attempt_count = e.attempt_count + 1,
           error = null
     where e.order_id = p_order_id and e.event_type = p_event_type
       and e.attempt_count < 5
       and (
         e.status = 'pending'
         or (e.status = 'failed' and e.last_attempt_at <= v_now - interval '1 minute'
             and e.last_attempt_at > v_now - interval '24 hours')
         or (e.status = 'processing' and e.processing_started_at <= v_now - make_interval(secs => p_lease_seconds)
             and e.last_attempt_at > v_now - interval '24 hours')
       )
     returning e.id, e.claim_id, e.attempt_count, e.payload
  )
  select claimed.id, claimed.claim_id, claimed.attempt_count, claimed.payload, 'claimed'::text from claimed;
  if found then return; end if;

  return query
  select e.id, e.claim_id, e.attempt_count, e.payload,
    case when e.status = 'sent' then 'already_sent'
         when e.attempt_count >= 5 or e.last_attempt_at <= v_now - interval '24 hours' then 'needs_review'
         else 'already_claimed' end::text
  from public.order_email_events e
  where e.order_id = p_order_id and e.event_type = p_event_type;
end;
$$;

create or replace function public.finish_order_email_event(
  p_id uuid,
  p_claim_id uuid,
  p_status text,
  p_recipient_email text,
  p_provider_message_id text,
  p_error text
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('sent', 'failed') then
    raise exception 'Invalid order email result';
  end if;
  update public.order_email_events e
     set status = p_status,
         recipient_email = p_recipient_email,
         provider_message_id = case when p_status = 'sent' then p_provider_message_id else null end,
         sent_at = case when p_status = 'sent' then now() else null end,
         error = case when p_status = 'failed' then left(p_error, 1000) else null end,
         processing_started_at = null,
         claim_id = null
   where e.id = p_id and e.claim_id = p_claim_id and e.status = 'processing';
  return found;
end;
$$;

revoke all on function public.enqueue_order_email_events() from public, anon, authenticated;
revoke all on function public.claim_order_email_event(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.finish_order_email_event(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_order_email_event(uuid, text, integer) to service_role;
grant execute on function public.finish_order_email_event(uuid, uuid, text, text, text, text) to service_role;
