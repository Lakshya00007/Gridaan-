-- =====================================================================
-- 0008_category_image_paths.sql
-- Set storefront image paths and display names for marketplace categories.
-- =====================================================================

with category_assets (slug, name, image_url) as (
  values
    ('women-earrings', 'Women Earrings', '/categories/women-earrings.webp'),
    ('women-necklaces', 'Women Necklaces', '/categories/women-necklaces.webp'),
    ('women-bangles-bracelets', 'Bangles & Bracelets', '/categories/women-bangles-bracelets.webp'),
    ('women-rings', 'Women Rings', '/categories/women-rings.webp'),
    ('women-anklets-toe-rings', 'Anklets & Toe Rings', '/categories/women-anklets-toe-rings.webp'),
    ('women-hair-jewellery', 'Maang Tikka & Hair Jewellery', '/categories/women-hair-jewellery.webp'),
    ('women-full-sets', 'Full Jewellery Sets', '/categories/women-full-sets.webp'),
    ('men-chains', 'Men Chains', '/categories/men-chains.webp'),
    ('men-pendants', 'Men Pendants', '/categories/men-pendants.webp'),
    ('men-kadas', 'Men Kadas', '/categories/men-kadas.webp'),
    ('men-bracelets', 'Men Bracelets', '/categories/men-bracelets.webp'),
    ('men-rings', 'Men Rings', '/categories/men-rings.webp'),
    ('men-ear-studs', 'Men Ear Studs', '/categories/men-ear-studs.webp')
)
update public.categories as c
set
  name = assets.name,
  image_url = assets.image_url,
  icon = null,
  updated_at = now()
from category_assets as assets
where c.slug = assets.slug;
