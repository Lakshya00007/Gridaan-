-- ────────────────────────────────────────────────────────────────────────────
-- Branding + safer search support
-- ────────────────────────────────────────────────────────────────────────────

-- Future orders should use the Gridaan prefix without affecting historical rows.
ALTER TABLE public.orders
ALTER COLUMN order_number
SET DEFAULT 'GR-' || lpad(nextval('public.order_number_seq')::text, 8, '0');

-- Add a trigger-maintained tsvector column so product search can use
-- parameterized full-text search without relying on a generated column.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS fts tsvector;

CREATE OR REPLACE FUNCTION public.update_products_fts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('simple'::regconfig, coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(NEW.tags, ' '), '')), 'C');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_fts ON public.products;

CREATE TRIGGER trg_products_fts
BEFORE INSERT OR UPDATE OF name, description, tags
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_products_fts();

UPDATE public.products
SET fts =
  setweight(to_tsvector('simple'::regconfig, coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(tags, ' '), '')), 'C');

CREATE INDEX IF NOT EXISTS idx_products_fts
  ON public.products
  USING gin (fts);
