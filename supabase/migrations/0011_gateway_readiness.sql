-- Gateway/KYC readiness copy updates.
-- Keep product/category slugs stable while making material claims clearly fashion/imitation only.

update public.products
set
  name = 'Antique Gold-Tone Pearl-Look Jhumka',
  description = 'Elegant antique gold-tone jhumka earrings with pearl-look beads, perfect for festive and ethnic fashion looks.',
  tags = array['jhumka', 'earrings', 'pearl-look', 'gold-tone', 'festive']::text[]
where slug = 'antique-gold-pearl-jhumka';

update public.products
set
  name = 'Oxidised-Look Chandbali Earrings',
  description = 'Traditional oxidised-look chandbali earrings designed for ethnic outfits, college looks and festive wear.',
  tags = array['chandbali', 'oxidised-look', 'earrings', 'ethnic']::text[]
where slug = 'oxidised-chandbali-earrings';

update public.products
set
  name = 'Kundan-Look Choker Set',
  description = 'Premium-look kundan-look choker set with matching earrings, ideal for festive and wedding guest outfits.',
  tags = array['kundan-look', 'choker', 'necklace set', 'wedding guest']::text[]
where slug = 'kundan-choker-set';

update public.categories
set description = 'Chokers, pendant sets, layered necklaces and kundan-look necklace styles.'
where slug = 'women-necklaces';

update public.categories
set description = 'Necklace and earring combos, bridal-look sets and festive fashion jewellery sets.'
where slug = 'women-full-sets';

update public.categories
set description = 'Cuban chains, rope chains, box-style chains and gold-tone or silver-tone fashion chain styles.'
where slug = 'men-chains';
