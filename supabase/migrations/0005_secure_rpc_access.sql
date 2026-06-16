-- ────────────────────────────────────────────────────────────────────────────
-- Security: Lock down RPC functions to prevent direct client abuse
-- ────────────────────────────────────────────────────────────────────────────

-- Postgres functions are executable by PUBLIC by default.
-- Revoke from PUBLIC as well as anon/authenticated, then explicitly grant only
-- the roles that should call each function.

REVOKE EXECUTE ON FUNCTION public.create_order(
  uuid, text, text, text, jsonb, jsonb, payment_method, text, text
) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_order_paid(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, order_status, text)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, numeric)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_order(
  uuid, text, text, text, jsonb, jsonb, payment_method, text, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid, text, text, text)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, order_status, text)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.create_order IS
  'Service-role only. Called by /api/orders after checkout validation.';

COMMENT ON FUNCTION public.mark_order_paid IS
  'Service-role only. Called by /api/razorpay/verify after signature validation.';

COMMENT ON FUNCTION public.update_order_status IS
  'Service-role only. Called by admin API routes after requireAdmin().';
