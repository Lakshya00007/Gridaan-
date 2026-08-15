# Meta Ecommerce Analytics

## Scope

Meta tracking is isolated to the storefront route group through
`src/app/(storefront)/layout.tsx`. The root layout and admin layout do not
import the Pixel shell.

Dataset and Pixel ID:

```text
1590827799422395
```

## Official Meta References

- Meta Pixel get started: https://developers.facebook.com/documentation/meta-pixel/get-started
- Meta Pixel reference and standard ecommerce event parameters: https://developers.facebook.com/documentation/meta-pixel/reference
- Meta Pixel conversion tracking: https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking
- Meta Pixel consent API guidance: https://developers.facebook.com/documentation/meta-pixel/implementation/gdpr
- Conversions API parameters: https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters
- Conversions API deduplication: https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events
- Conversions API main body parameters and `test_event_code`: https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/main-body
- Conversions API customer information parameters: https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters
- Graph API changelog: https://developers.facebook.com/docs/graph-api/changelog/
- Graph API versions: https://developers.facebook.com/docs/graph-api/changelog/versions/

Current implementation uses Graph API `v26.0`.

## Consent Model

Marketing tracking defaults to off. The first-party consent record is stored in
localStorage under:

```text
gridaan_consent_v1
```

The record contains only the consent version, the required `necessary: true`
flag, a boolean marketing choice, and the decision timestamp. It does not store
customer PII.

The footer "Privacy choices" control reopens the consent UI. Revoking consent
stops future Pixel calls and sends Meta's documented `fbq('consent', 'revoke')`
signal if the Pixel was already loaded. A previously downloaded third-party
script is not removed from the page.

## Runtime Gating

Pixel activation requires all of the following:

- `NEXT_PUBLIC_META_PIXEL_ID` is set to a numeric Pixel ID.
- The runtime hostname is `www.gridaan.com`.
- Marketing consent is granted.
- `NODE_ENV` is not `test`.

Localhost, `127.0.0.1`, and Vercel preview hosts do not send production Pixel
events by default, even if the public Pixel ID is accidentally configured.
Non-production testing additionally requires
`NEXT_PUBLIC_META_ALLOW_NON_PRODUCTION=true` and the browser debug opt-in flag.

## Local and Preview Debugging

Use this only for controlled Meta Events Manager testing. Do not keep it set in
normal development sessions.

1. Configure `NEXT_PUBLIC_META_PIXEL_ID` in the environment you are testing.
2. Set `NEXT_PUBLIC_META_ALLOW_NON_PRODUCTION=true` only for that controlled
   local or preview test environment.
3. In the browser console for that local or preview page, run:

```js
localStorage.setItem('gridaan_meta_debug_allow_non_production', 'true');
```

4. Open "Privacy choices" and accept marketing analytics.
5. Reload or navigate to a storefront route.
6. When finished, disable the override:

```js
localStorage.removeItem('gridaan_meta_debug_allow_non_production');
localStorage.removeItem('gridaan_consent_v1');
```

## Events

- `PageView`: controlled by the storefront `MetaPixel` shell, one event per
  actual pathname.
- `ViewContent`: product detail client after a real product is present.
- `AddToCart`: after successful Zustand cart mutation at product detail,
  Buy Now, and product-card add surfaces.
- `InitiateCheckout`: when a non-empty cart enters `CheckoutView`.
- `Purchase`: after `/api/payments/verify` returns a captured, placed order.

Browser and server Purchase events share:

```text
purchase:<order_number>
```

## CAPI

CAPI sends only server-side `Purchase` events from the canonical captured-order
finalization flow in `src/lib/payments/payment-service.ts`.

Required server variables:

```text
META_CAPI_ENABLED
META_CAPI_ACCESS_TOKEN
META_CAPI_TEST_EVENT_CODE
NEXT_PUBLIC_META_ALLOW_NON_PRODUCTION
```

`META_CAPI_ACCESS_TOKEN` is server-only. Never create a `NEXT_PUBLIC_` token
variant.

CAPI respects the consent snapshot stored in `orders.metadata.marketing_consent`.
Missing, invalid, old-version, or false consent skips server-side Meta sending.

The outbox table `public.meta_conversion_events` deduplicates server attempts
with a unique deterministic `event_id`. A service-role-only RPC atomically
claims one `pending`, `failed`, or stale `processing` row at a time, increments
`attempt_count`, assigns a short claim token, and stores the original purchase
`event_time` from the captured payment timestamp. Successful sends become
terminal `sent` rows. Failed or stale claims can be retried by a later
legitimate callback.

Meta delivery is scheduled from the payment verification and Razorpay webhook
route handlers with Next.js `after()`, so Graph API latency does not delay a
successful payment verification response or webhook acknowledgement.

## Manual Verification

Before consent, filter DevTools Network for `facebook` or `fbevents`. There
should be no Meta SDK or event request.

After rejecting consent, navigate `/`, `/shop`, a product page, and `/checkout`.
There should still be no Meta request.

After accepting consent on `www.gridaan.com`, confirm:

- `https://connect.facebook.net/en_US/fbevents.js` loads.
- One initial `PageView` fires.
- Storefront pathname navigation fires one `PageView` per pathname.
- Product detail fires `ViewContent`.
- Add-to-cart actions fire `AddToCart` after the cart changes.
- Non-empty checkout entry fires `InitiateCheckout`.
- A controlled captured Razorpay test purchase fires browser `Purchase`.
- Meta Events Manager Test Events shows browser and server Purchase with the
  same event name and event ID.

Visit `/admin` and `/admin/orders`; no Pixel SDK or Meta event transport should
load.
