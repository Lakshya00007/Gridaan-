-- Hide legacy launch categories only when no products still depend on them.

update public.categories as category
set is_active = false
where category.slug in (
  'earrings',
  'necklace-sets',
  'combo-packs',
  'wedding-guest-jewelry',
  'daily-wear-jewelry'
)
and not exists (
  select 1
  from public.products as product
  where product.category_id = category.id
);
