-- =====================================================================
-- 0004_storage.sql
-- Storage buckets and policies for product/category images.
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('category-images', 'category-images', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- product-images
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id in ('product-images', 'category-images', 'avatars'));

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write"
  on storage.objects for insert
  with check (
    bucket_id in ('product-images', 'category-images', 'avatars')
    and public.is_admin()
  );

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects for update
  using (
    bucket_id in ('product-images', 'category-images', 'avatars')
    and public.is_admin()
  );

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects for delete
  using (
    bucket_id in ('product-images', 'category-images', 'avatars')
    and public.is_admin()
  );
