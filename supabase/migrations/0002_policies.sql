-- =====================================================================
-- 0002_policies.sql
-- Row Level Security policies.
-- =====================================================================

-- Helper: is_admin()
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- categories (public read, admin write)
-- ---------------------------------------------------------------------
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
  on public.categories for select using (is_active = true or public.is_admin());

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- products (public read, admin write)
-- ---------------------------------------------------------------------
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select using (true);

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- addresses (user-owned)
-- ---------------------------------------------------------------------
drop policy if exists "addresses_owner_all" on public.addresses;
create policy "addresses_owner_all"
  on public.addresses for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------
drop policy if exists "orders_owner_select" on public.orders;
create policy "orders_owner_select"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_admin_write" on public.orders;
create policy "orders_admin_write"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

-- Order creation uses SECURITY DEFINER functions exposed via API
-- because end users need to insert orders tied to their user_id.

-- ---------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------
drop policy if exists "order_items_owner_select" on public.order_items;
create policy "order_items_owner_select"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "order_items_admin_write" on public.order_items;
create policy "order_items_admin_write"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- coupons (public read active, admin write)
-- ---------------------------------------------------------------------
drop policy if exists "coupons_public_read" on public.coupons;
create policy "coupons_public_read"
  on public.coupons for select using (is_active = true or public.is_admin());

drop policy if exists "coupons_admin_write" on public.coupons;
create policy "coupons_admin_write"
  on public.coupons for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- wishlist_items
-- ---------------------------------------------------------------------
drop policy if exists "wishlist_owner_all" on public.wishlist_items;
create policy "wishlist_owner_all"
  on public.wishlist_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- order_status_history
-- ---------------------------------------------------------------------
drop policy if exists "order_history_owner_select" on public.order_status_history;
create policy "order_history_owner_select"
  on public.order_status_history for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "order_history_admin_write" on public.order_status_history;
create policy "order_history_admin_write"
  on public.order_status_history for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- admin_audit_log
-- ---------------------------------------------------------------------
drop policy if exists "audit_log_admin_all" on public.admin_audit_log;
create policy "audit_log_admin_all"
  on public.admin_audit_log for all
  using (public.is_admin())
  with check (public.is_admin());
