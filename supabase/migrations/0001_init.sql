-- =====================================================================
-- 0001_init.sql
-- Production schema for Lumière Jewels.
-- This migration creates the full e-commerce backend:
--   profiles, categories, products, orders, order_items, addresses,
--   wishlist_items, coupons, admins
-- It also enables RLS and creates policies + triggers.
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
-- ENUMS
-- =====================================================================
do $$ begin
  create type public.order_status as enum (
    'placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending', 'paid', 'failed', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum (
    'razorpay', 'cod'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.coupon_type as enum (
    'percentage', 'fixed'
  );
exception when duplicate_object then null; end $$;

-- =====================================================================
-- profiles
--   Mirrors auth.users; one row per user.
-- =====================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  phone        text,
  avatar_url   text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_is_admin_idx on public.profiles(is_admin);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- categories
-- =====================================================================
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  image_url   text,
  icon        text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists categories_slug_idx on public.categories(slug);
create index if not exists categories_active_idx on public.categories(is_active);

-- =====================================================================
-- products
-- =====================================================================
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  description     text not null,
  price           numeric(10,2) not null check (price >= 0),
  original_price  numeric(10,2) not null check (original_price >= 0),
  discount        int generated always as (
                    case when original_price > 0
                         then round((1 - price / original_price) * 100)::int
                         else 0 end
                  ) stored,
  images          text[] not null default '{}',
  category_id     uuid references public.categories(id) on delete set null,
  tags            text[] not null default '{}',
  in_stock        boolean not null default true,
  stock_count     int not null default 0 check (stock_count >= 0),
  rating          numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count    int not null default 0,
  is_trending     boolean not null default false,
  is_new_arrival  boolean not null default false,
  is_best_seller  boolean not null default false,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_slug_idx on public.products(slug);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_in_stock_idx on public.products(in_stock);
create index if not exists products_trending_idx on public.products(is_trending);
create index if not exists products_new_arrival_idx on public.products(is_new_arrival);
create index if not exists products_best_seller_idx on public.products(is_best_seller);
create index if not exists products_price_idx on public.products(price);
create index if not exists products_created_at_idx on public.products(created_at desc);
create index if not exists products_search_idx
  on public.products using gin (to_tsvector('english', name || ' ' || coalesce(description, '')));

-- =====================================================================
-- addresses
-- =====================================================================
create table if not exists public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  full_name    text not null,
  phone        text not null,
  line1        text not null,
  line2        text,
  city         text not null,
  state        text not null,
  pincode      text not null,
  country      text not null default 'India',
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses(user_id);

-- =====================================================================
-- coupons
-- =====================================================================
create table if not exists public.coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  description    text,
  type           coupon_type not null,
  value          numeric(10,2) not null check (value > 0),
  min_order      numeric(10,2) not null default 0,
  max_discount   numeric(10,2),
  usage_limit    int,
  usage_count    int not null default 0,
  per_user_limit int not null default 1,
  is_active      boolean not null default true,
  starts_at      timestamptz,
  expires_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists coupons_code_idx on public.coupons(code);
create index if not exists coupons_active_idx on public.coupons(is_active);

-- =====================================================================
-- orders
-- =====================================================================
create sequence if not exists public.order_number_seq;

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique
                      default 'LJ-' || lpad(nextval('public.order_number_seq')::text, 8, '0'),
  user_id             uuid references public.profiles(id) on delete set null,
  customer_email      text,
  customer_phone      text not null,
  customer_name       text not null,
  address_id          uuid references public.addresses(id) on delete set null,
  shipping_address    jsonb not null,
  subtotal            numeric(10,2) not null check (subtotal >= 0),
  discount            numeric(10,2) not null default 0 check (discount >= 0),
  shipping            numeric(10,2) not null default 0 check (shipping >= 0),
  tax                 numeric(10,2) not null default 0 check (tax >= 0),
  total               numeric(10,2) not null check (total >= 0),
  coupon_id           uuid references public.coupons(id) on delete set null,
  coupon_code         text,
  payment_method      payment_method not null,
  payment_status      payment_status not null default 'pending',
  order_status        order_status not null default 'placed',
  razorpay_order_id   text,
  razorpay_payment_id text,
  razorpay_signature  text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(order_status);
create index if not exists orders_payment_idx on public.orders(payment_status);
create index if not exists orders_rzp_order_idx on public.orders(razorpay_order_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- =====================================================================
-- order_items
-- =====================================================================
create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete restrict,
  product_name    text not null,
  product_image   text,
  unit_price      numeric(10,2) not null check (unit_price >= 0),
  quantity        int not null check (quantity > 0),
  line_total      numeric(10,2) not null check (line_total >= 0),
  created_at      timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);

-- =====================================================================
-- wishlist_items
-- =====================================================================
create table if not exists public.wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlist_user_idx on public.wishlist_items(user_id);

-- =====================================================================
-- order_status_history
-- =====================================================================
create table if not exists public.order_status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  from_status  order_status,
  to_status    order_status not null,
  changed_by   uuid references public.profiles(id),
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists order_status_history_order_idx on public.order_status_history(order_id);

-- =====================================================================
-- admin audit log
-- =====================================================================
create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid not null references public.profiles(id) on delete cascade,
  action       text not null,
  entity       text not null,
  entity_id    text,
  details      jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_admin_idx on public.admin_audit_log(admin_id);
create index if not exists admin_audit_entity_idx on public.admin_audit_log(entity, entity_id);

-- =====================================================================
-- updated_at triggers
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'profiles','categories','products','addresses','coupons','orders'
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

-- =====================================================================
-- updated_at timestamp tracking
-- =====================================================================
alter table public.profiles   enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.addresses   enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.coupons     enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.admin_audit_log enable row level security;
