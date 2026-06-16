-- ────────────────────────────────────────────────────────────────────────────
-- Branding + safer search support
-- ────────────────────────────────────────────────────────────────────────────

-- Future orders should use the Gridaan prefix without affecting historical rows.
ALTER TABLE public.orders
ALTER COLUMN order_number
SET DEFAULT 'GR-' || lpad(nextval('public.order_number_seq')::text, 8, '0');

-- Add a generated tsvector column so product search can use parameterized
-- full-text search instead of interpolating user input into `.or(...)`.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(tags, '{}'::text[]), ' ')), 'C')
) STORED;

CREATE INDEX IF NOT EXISTS products_fts_idx
  ON public.products
  USING gin (fts);
