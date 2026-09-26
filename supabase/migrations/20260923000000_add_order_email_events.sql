-- Idempotent server-side transactional email events.
create table if not exists public.order_email_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in (
    'order_confirmation',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'admin_new_order'
  )),
  recipient_email text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (order_id, event_type)
);

create index if not exists order_email_events_order_idx
  on public.order_email_events(order_id);

alter table public.order_email_events enable row level security;
revoke all on public.order_email_events from anon, authenticated;
grant select, insert, update on public.order_email_events to service_role;
