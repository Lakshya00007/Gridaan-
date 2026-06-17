-- =====================================================================
-- 0007_category_structure_marketplace.sql
-- Seed women/men marketplace categories and safely remap legacy launch
-- category assignments without deleting any products.
-- =====================================================================

with seeded_categories (slug, name, description, icon, is_active, sort_order) as (
  values
    (
      'women-earrings',
      'Women Earrings',
      'Jhumkas, studs, hoops, chandbali earrings and ear cuffs for daily, festive and wedding looks.',
      '✨',
      true,
      1
    ),
    (
      'women-necklaces',
      'Women Necklaces',
      'Chokers, pendant sets, layered necklaces and kundan-look necklace styles.',
      '💎',
      true,
      2
    ),
    (
      'women-bangles-bracelets',
      'Bangles & Bracelets',
      'Lac bangles, metal bangles, charm bracelets and ethnic bracelet styles.',
      '🪷',
      true,
      3
    ),
    (
      'women-rings',
      'Women Rings',
      'Cocktail rings, adjustable rings, stackable rings and fashion rings.',
      '💍',
      true,
      4
    ),
    (
      'women-anklets-toe-rings',
      'Anklets & Toe Rings',
      'Payal, bichiya, anklets and toe rings for ethnic and festive styling.',
      '🌸',
      true,
      5
    ),
    (
      'women-hair-jewellery',
      'Maang Tikka & Hair Jewellery',
      'Maang tikka, matha patti, hair chains and traditional hair jewellery.',
      '👑',
      true,
      6
    ),
    (
      'women-full-sets',
      'Full Jewellery Sets',
      'Necklace and earring combos, bridal-look sets and festive jewellery sets.',
      '🎁',
      true,
      7
    ),
    (
      'men-chains',
      'Men Chains',
      'Cuban chains, rope chains, box chains and gold/silver plated chain styles.',
      '⛓️',
      true,
      8
    ),
    (
      'men-pendants',
      'Men Pendants',
      'Om pendants, skull pendants, initials, evil eye and statement pendants.',
      '🛡️',
      true,
      9
    ),
    (
      'men-kadas',
      'Men Kadas',
      'Metal kadas, steel-finish kadas and bold everyday wristwear.',
      '🔗',
      true,
      10
    ),
    (
      'men-bracelets',
      'Men Bracelets',
      'Rudraksha bracelets, lava stone bracelets, beaded bracelets and leather-metal styles.',
      '🧿',
      true,
      11
    ),
    (
      'men-rings',
      'Men Rings',
      'Band rings, signet rings, stone-look rings and masculine fashion rings.',
      '♠️',
      true,
      12
    ),
    (
      'men-ear-studs',
      'Men Ear Studs',
      'Small studs, hoops and minimal earrings for men.',
      '⚫',
      true,
      13
    )
)
insert into public.categories (slug, name, description, icon, is_active, sort_order)
select slug, name, description, icon, is_active, sort_order
from seeded_categories
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

with category_remap (old_slug, new_slug) as (
  values
    ('earrings', 'women-earrings'),
    ('necklace-sets', 'women-necklaces'),
    ('combo-packs', 'women-full-sets'),
    ('daily-wear-jewelry', 'women-earrings')
)
update public.products as p
set
  category_id = target.id,
  updated_at = now()
from category_remap as remap
join public.categories as legacy on legacy.slug = remap.old_slug
join public.categories as target on target.slug = remap.new_slug
where p.category_id = legacy.id
  and p.category_id is distinct from target.id;

update public.categories as c
set
  is_active = exists (
    select 1
    from public.products as p
    where p.category_id = c.id
  ),
  updated_at = now()
where c.slug in (
  'earrings',
  'necklace-sets',
  'combo-packs',
  'wedding-guest-jewelry',
  'daily-wear-jewelry'
);
