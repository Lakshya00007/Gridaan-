-- =====================================================================
-- 0005_seed.sql
-- Seed categories and coupons.
-- Replace categories with your real data.
-- =====================================================================

insert into public.categories (slug, name, description, image_url, icon, sort_order) values
  ('earrings',          'Earrings',          'Elegant earrings for every occasion',  null, '✨', 1),
  ('necklaces',         'Necklaces',         'Statement necklaces & chains',         null, '💎', 2),
  ('rings',             'Rings',             'Beautiful rings for every finger',      null, '💍', 3),
  ('bracelets',         'Bracelets',         'Charming bracelets & cuffs',            null, '⭐', 4),
  ('bangles',           'Bangles',           'Traditional & modern bangles',         null, '🌟', 5),
  ('anklets',           'Anklets',           'Delicate anklets & payal',             null, '🦋', 6),
  ('bridal-sets',       'Bridal Sets',       'Complete bridal jewelry sets',          null, '👑', 7),
  ('korean-jewelry',    'Korean Jewelry',    'Minimalist Korean style',              null, '🌸', 8),
  ('oxidized-jewelry',  'Oxidized Jewelry',  'Vintage oxidized pieces',              null, '🖤', 9),
  ('daily-wear',        'Daily Wear',        'Everyday elegant accessories',         null, '🌿', 10)
on conflict (slug) do nothing;

insert into public.coupons (code, description, type, value, min_order, max_discount, is_active) values
  ('WELCOME10',  '10% off on first order',           'percentage', 10,  500,  null, true),
  ('FLAT200',    'Flat ₹200 off on orders above ₹1000', 'fixed',    200, 1000,  null, true),
  ('BRIDAL15',   '15% off on bridal collections',    'percentage', 15, 2000,  1500, true),
  ('FESTIVE20',  '20% off festive orders',           'percentage', 20, 1500,  2000, true)
on conflict (code) do nothing;
