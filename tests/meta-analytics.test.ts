import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  META_DEBUG_NON_PRODUCTION_STORAGE_KEY,
  META_GRAPH_API_VERSION,
  META_PIXEL_ID,
  META_PRODUCTION_HOST,
  canActivateMetaPixel,
} from '@/lib/analytics/config';
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_PREFERENCES_EVENT,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  clearConsentStorage,
  getCheckoutConsentSnapshot,
  getConsentState,
  openPrivacyChoices,
  parseConsentRecord,
  saveBrowserConsent,
  subscribeToConsentChanges,
  writeConsentToStorage,
  type ConsentStorage,
} from '@/lib/analytics/consent';
import {
  buildAddToCartEvent,
  buildBrowserPurchaseEvent,
  buildInitiateCheckoutEvent,
  buildServerPurchaseEvent,
  buildViewContentEvent,
  finiteRupeeValue,
  getPurchaseEventId,
  positiveQuantity,
  toMetaContentId,
} from '@/lib/analytics/meta-events';
import {
  getMetaUserData,
  hasOrderMarketingConsent,
  normalizeEmailForMeta,
  normalizePhoneForMeta,
  sha256Hex,
} from '@/lib/analytics/meta-capi-utils';
import { isSuccessfulMetaCapiResponse } from '@/lib/analytics/meta-capi-response';
import {
  META_CAPI_CLAIM_LEASE_SECONDS,
  canClaimMetaConversionEvent,
  canCompleteMetaConversionClaim,
  canSkipMetaConversionEvent,
  isTerminalMetaConversionStatus,
} from '@/lib/analytics/meta-capi-state';
import { getActualCartAddedQuantity } from '@/lib/cart-quantity';
import type { CartProductSnapshot, OrderSuccessSummary, Product } from '@/types';

const projectRoot = path.resolve(import.meta.dirname, '..');
const productId = '11111111-1111-4111-8111-111111111111';
const secondProductId = '22222222-2222-4222-8222-222222222222';

class MemoryStorage implements ConsentStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

class TestCustomEvent<T = unknown> extends Event {
  detail: T | undefined;

  constructor(type: string, init?: CustomEventInit<T>) {
    super(type);
    this.detail = init?.detail;
  }
}

function read(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function walk(absolute: string): string[] {
  if (statSync(absolute).isDirectory()) {
    return readdirSync(absolute).flatMap((entry) => walk(path.join(absolute, entry)));
  }
  return /\.(?:ts|tsx|js|jsx|mjs|sql|md|json)$/.test(absolute) ? [absolute] : [];
}

function product(overrides: Partial<Product> = {}) {
  return {
    id: productId,
    slug: 'gold-earrings',
    name: 'Gold Earrings',
    description: 'A trusted product description.',
    price: 1299.5,
    original_price: 1599,
    discount: 0,
    images: ['https://example.com/earrings.jpg'],
    category_id: null,
    tags: [],
    in_stock: true,
    stock_count: 5,
    rating: 0,
    review_count: 0,
    is_trending: false,
    is_new_arrival: false,
    is_best_seller: false,
    metadata: {},
    created_at: '2026-08-16T00:00:00.000Z',
    updated_at: '2026-08-16T00:00:00.000Z',
    ...overrides,
  } as Product;
}

function cartProduct(overrides: Partial<CartProductSnapshot> = {}) {
  return {
    id: productId,
    slug: 'gold-earrings',
    name: 'Gold Earrings',
    price: 1299.5,
    original_price: 1599,
    discount: 0,
    images: ['https://example.com/earrings.jpg'],
    in_stock: true,
    stock_count: 5,
    category: null,
    ...overrides,
  } as CartProductSnapshot;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Meta consent storage', () => {
  it('fails closed before a decision and when stored data is invalid or old', () => {
    const storage = new MemoryStorage();

    expect(getConsentState(storage)).toMatchObject({
      necessary: true,
      marketing: false,
      hasDecision: false,
      requiresConsent: true,
    });

    storage.setItem(CONSENT_STORAGE_KEY, '{not-json');
    expect(getConsentState(storage).marketing).toBe(false);
    expect(getConsentState(storage).requiresConsent).toBe(true);

    storage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: CONSENT_VERSION - 1,
        necessary: true,
        marketing: true,
        decidedAt: '2026-08-16T00:00:00.000Z',
      })
    );
    expect(getConsentState(storage).marketing).toBe(false);
    expect(getConsentState(storage).requiresConsent).toBe(true);
  });

  it('persists accept and reject choices without storing customer PII', () => {
    const storage = new MemoryStorage();
    const accepted = writeConsentToStorage(storage, true, '2026-08-16T00:00:00.000Z');

    expect(accepted).toEqual({
      version: CONSENT_VERSION,
      necessary: true,
      marketing: true,
      decidedAt: '2026-08-16T00:00:00.000Z',
    });
    expect(getConsentState(storage)).toMatchObject({
      marketing: true,
      hasDecision: true,
      requiresConsent: false,
    });
    expect(storage.getItem(CONSENT_STORAGE_KEY)).not.toMatch(/email|phone|customer/i);

    writeConsentToStorage(storage, false, '2026-08-16T01:00:00.000Z');
    expect(getConsentState(storage)).toMatchObject({
      necessary: true,
      marketing: false,
      hasDecision: true,
      requiresConsent: false,
    });
  });

  it('supports clearing, checkout snapshots, parsing, and live preference events', () => {
    const storage = new MemoryStorage();
    const target = new EventTarget();
    vi.stubGlobal('CustomEvent', TestCustomEvent);
    vi.stubGlobal('window', {
      localStorage: storage,
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
    });

    const seen: string[] = [];
    const unsubscribe = subscribeToConsentChanges(() => seen.push('changed'));

    saveBrowserConsent(true);
    openPrivacyChoices();
    expect(seen).toEqual(['changed', 'changed']);
    expect(parseConsentRecord(storage.getItem(CONSENT_STORAGE_KEY))?.marketing).toBe(true);
    expect(getCheckoutConsentSnapshot(storage)).toEqual({
      version: CONSENT_VERSION,
      marketing: true,
      decided_at: expect.any(String),
    });

    unsubscribe();
    saveBrowserConsent(false);
    expect(seen).toEqual(['changed', 'changed']);

    clearConsentStorage(storage);
    expect(getConsentState(storage).requiresConsent).toBe(true);
    expect(CONSENT_CHANGED_EVENT).toBe('gridaan:consent-changed');
    expect(CONSENT_PREFERENCES_EVENT).toBe('gridaan:open-privacy-choices');
  });
});

describe('Meta runtime gates', () => {
  it('enables production with consent and a Pixel ID without requiring debug flags', () => {
    expect(
      canActivateMetaPixel({
        pixelId: META_PIXEL_ID,
        hostname: META_PRODUCTION_HOST,
        marketingConsent: true,
      })
    ).toBe(true);
  });

  it('disables production when consent is missing', () => {
    expect(
      canActivateMetaPixel({
        pixelId: META_PIXEL_ID,
        hostname: META_PRODUCTION_HOST,
        marketingConsent: false,
      })
    ).toBe(false);
  });

  it('disables all hosts when the Pixel ID is missing', () => {
    expect(
      canActivateMetaPixel({
        pixelId: undefined,
        hostname: META_PRODUCTION_HOST,
        marketingConsent: true,
      })
    ).toBe(false);
    expect(
      canActivateMetaPixel({
        pixelId: undefined,
        hostname: 'localhost',
        marketingConsent: true,
        allowNonProduction: true,
        debugAllowNonProduction: true,
      })
    ).toBe(false);
  });

  it('does not let a localStorage debug flag alone enable localhost or preview tracking', () => {
    expect(
      canActivateMetaPixel({
        pixelId: META_PIXEL_ID,
        hostname: 'localhost',
        marketingConsent: true,
        debugAllowNonProduction: true,
      })
    ).toBe(false);
    expect(
      canActivateMetaPixel({
        pixelId: META_PIXEL_ID,
        hostname: 'gridaan-git-main.vercel.app',
        marketingConsent: true,
        debugAllowNonProduction: true,
      })
    ).toBe(false);
  });

  it('enables non-production only with env opt-in, debug flag, consent, and Pixel ID', () => {
    expect(
      canActivateMetaPixel({
        pixelId: META_PIXEL_ID,
        hostname: 'localhost',
        marketingConsent: true,
        allowNonProduction: true,
        debugAllowNonProduction: true,
      })
    ).toBe(true);
    expect(
      canActivateMetaPixel({
        pixelId: META_PIXEL_ID,
        hostname: 'gridaan-git-main.vercel.app',
        marketingConsent: true,
        allowNonProduction: true,
        debugAllowNonProduction: true,
      })
    ).toBe(true);
    expect(
      canActivateMetaPixel({
        pixelId: META_PIXEL_ID,
        hostname: 'localhost',
        marketingConsent: false,
        allowNonProduction: true,
        debugAllowNonProduction: true,
      })
    ).toBe(false);
    expect(
      canActivateMetaPixel({
        pixelId: META_PIXEL_ID,
        hostname: 'localhost',
        marketingConsent: true,
        allowNonProduction: true,
        debugAllowNonProduction: false,
      })
    ).toBe(false);
  });

  it('keeps tests disabled and preserves the local debug storage key', () => {
    expect(
      canActivateMetaPixel({
        pixelId: META_PIXEL_ID,
        hostname: META_PRODUCTION_HOST,
        marketingConsent: true,
        testMode: true,
      })
    ).toBe(false);
    expect(META_DEBUG_NON_PRODUCTION_STORAGE_KEY).toBe(
      'gridaan_meta_debug_allow_non_production'
    );
  });
});

describe('Meta ecommerce events', () => {
  it('uses product UUID content IDs and INR rupee values', () => {
    const item = product();

    expect(toMetaContentId(item)).toBe(productId);
    expect(finiteRupeeValue(1299.456)).toBe(1299.46);
    expect(finiteRupeeValue(Number.NaN)).toBe(0);
    expect(positiveQuantity(2.9)).toBe(2);
    expect(positiveQuantity(0)).toBe(1);

    expect(buildViewContentEvent(item)).toEqual({
      content_ids: [productId],
      content_name: 'Gold Earrings',
      content_type: 'product',
      contents: [{ id: productId, quantity: 1, item_price: 1299.5 }],
      value: 1299.5,
      currency: 'INR',
    });

    expect(buildAddToCartEvent(item, 2)).toMatchObject({
      content_ids: [productId],
      content_name: 'Gold Earrings',
      value: 2599,
      currency: 'INR',
    });
  });

  it('builds checkout and purchase payloads without browser PII fields', () => {
    const items = [
      { product: cartProduct(), quantity: 2 },
      {
        product: cartProduct({
          id: secondProductId,
          slug: 'silver-ring',
          name: 'Silver Ring',
          price: 499,
        }),
        quantity: 1,
      },
    ];
    const checkout = buildInitiateCheckoutEvent({ items, value: 3098 });
    const order: OrderSuccessSummary = {
      id: 'order-id',
      order_number: 'GR-00000001',
      customer_name: 'Aanya Sharma',
      total: 3098,
      payment_method: 'razorpay',
      payment_status: 'captured',
      order_status: 'placed',
      created_at: '2026-08-16T00:00:00.000Z',
    };
    const purchase = buildBrowserPurchaseEvent({ order, items });

    expect(checkout).toMatchObject({
      content_ids: [productId, secondProductId],
      content_type: 'product',
      currency: 'INR',
      value: 3098,
      num_items: 3,
    });
    expect(purchase.eventId).toBe('purchase:GR-00000001');
    expect(purchase.data.order_id).toBe('GR-00000001');
    expect(JSON.stringify(purchase.data)).not.toMatch(/email|phone|customer_name|address/i);
  });

  it('builds server Purchase from historical order item values', () => {
    const purchase = buildServerPurchaseEvent({
      orderNumber: 'GR-00000002',
      value: 1798.5,
      items: [
        { product_id: productId, quantity: 1, unit_price: 1299.5 },
        { product_id: secondProductId, quantity: 1, unit_price: 499 },
      ],
    });

    expect(purchase).toEqual({
      eventId: 'purchase:GR-00000002',
      data: {
        content_ids: [productId, secondProductId],
        content_type: 'product',
        contents: [
          { id: productId, quantity: 1, item_price: 1299.5 },
          { id: secondProductId, quantity: 1, item_price: 499 },
        ],
        value: 1798.5,
        currency: 'INR',
        num_items: 2,
        order_id: 'GR-00000002',
      },
    });
  });

  it('uses deterministic non-PII Purchase event IDs', () => {
    expect(getPurchaseEventId('GR-00000001')).toBe('purchase:GR-00000001');
    expect(getPurchaseEventId('GR-00000001')).toBe(getPurchaseEventId('GR-00000001'));
    expect(getPurchaseEventId('GR-00000001')).not.toBe(getPurchaseEventId('GR-00000002'));
  });
});

describe('Meta CAPI matching and consent helpers', () => {
  it('normalizes and hashes documented customer matching fields only', () => {
    expect(normalizeEmailForMeta(' AANYA@Example.COM ')).toBe('aanya@example.com');
    expect(normalizeEmailForMeta('not-an-email')).toBeNull();
    expect(normalizePhoneForMeta('+91 98765 43210')).toBe('919876543210');

    const emailHash = sha256Hex('aanya@example.com');
    const phoneHash = sha256Hex('919876543210');
    expect(emailHash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      getMetaUserData({
        email: ' AANYA@Example.COM ',
        phone: '+91 98765 43210',
      })
    ).toEqual({
      em: [emailHash],
      ph: [phoneHash],
    });
  });

  it('requires current-version marketing consent before CAPI eligibility', () => {
    expect(
      hasOrderMarketingConsent({
        marketing_consent: {
          version: CONSENT_VERSION,
          marketing: true,
          decided_at: '2026-08-16T00:00:00.000Z',
        },
      })
    ).toBe(true);
    expect(
      hasOrderMarketingConsent({
        marketing_consent: {
          version: CONSENT_VERSION,
          marketing: false,
          decided_at: '2026-08-16T00:00:00.000Z',
        },
      })
    ).toBe(false);
    expect(hasOrderMarketingConsent({})).toBe(false);
    expect(hasOrderMarketingConsent(null)).toBe(false);
    expect(
      hasOrderMarketingConsent({
        marketing_consent: { version: CONSENT_VERSION - 1, marketing: true },
      })
    ).toBe(false);
  });
});

describe('Meta CAPI outbox state and response contracts', () => {
  const now = new Date('2026-08-16T10:00:00.000Z');
  const freshProcessingStartedAt = '2026-08-16T09:59:00.000Z';
  const staleProcessingStartedAt = '2026-08-16T09:40:00.000Z';

  it('prevents two concurrent logical CAPI attempts from both owning a send claim', () => {
    expect(canClaimMetaConversionEvent({ status: 'pending' }, { now })).toBe(true);
    expect(
      canClaimMetaConversionEvent(
        { status: 'processing', processing_started_at: freshProcessingStartedAt },
        { now }
      )
    ).toBe(false);
  });

  it('keeps sent terminal and prevents skipped from overwriting sent', () => {
    expect(isTerminalMetaConversionStatus('sent')).toBe(true);
    expect(canClaimMetaConversionEvent({ status: 'sent' }, { now })).toBe(false);
    expect(canSkipMetaConversionEvent({ status: 'sent' }, { now })).toBe(false);
  });

  it('allows failed or stale processing claims to be reclaimed but not fresh claims', () => {
    expect(canClaimMetaConversionEvent({ status: 'failed' }, { now })).toBe(true);
    expect(
      canClaimMetaConversionEvent(
        { status: 'processing', processing_started_at: staleProcessingStartedAt },
        { now, leaseSeconds: META_CAPI_CLAIM_LEASE_SECONDS }
      )
    ).toBe(true);
    expect(
      canClaimMetaConversionEvent(
        { status: 'processing', processing_started_at: freshProcessingStartedAt },
        { now, leaseSeconds: META_CAPI_CLAIM_LEASE_SECONDS }
      )
    ).toBe(false);
  });

  it('requires the current claim token before completing a processing attempt', () => {
    expect(
      canCompleteMetaConversionClaim({
        event: { status: 'processing', claim_id: 'claim-1' },
        expectedClaimId: 'claim-1',
      })
    ).toBe(true);
    expect(
      canCompleteMetaConversionClaim({
        event: { status: 'processing', claim_id: 'claim-2' },
        expectedClaimId: 'claim-1',
      })
    ).toBe(false);
    expect(
      canCompleteMetaConversionClaim({
        event: { status: 'sent', claim_id: 'claim-1' },
        expectedClaimId: 'claim-1',
      })
    ).toBe(false);
  });

  it('accepts only the documented successful Meta CAPI response shape', () => {
    expect(
      isSuccessfulMetaCapiResponse(true, {
        events_received: 1,
        messages: [],
        fbtrace_id: 'trace-id',
      })
    ).toBe(true);
    expect(isSuccessfulMetaCapiResponse(true, {})).toBe(false);
    expect(isSuccessfulMetaCapiResponse(true, { events_received: 0 })).toBe(false);
    expect(isSuccessfulMetaCapiResponse(false, { events_received: 1 })).toBe(false);
  });
});

describe('cart AddToCart analytics quantity', () => {
  it('reports only the actual added quantity after stock clamping', () => {
    expect(
      getActualCartAddedQuantity({
        currentQuantity: 0,
        requestedQuantity: 2,
        stockCount: 5,
      })
    ).toBe(2);
    expect(
      getActualCartAddedQuantity({
        currentQuantity: 4,
        requestedQuantity: 3,
        stockCount: 5,
      })
    ).toBe(1);
    expect(
      getActualCartAddedQuantity({
        currentQuantity: 5,
        requestedQuantity: 1,
        stockCount: 5,
      })
    ).toBe(0);
  });
});

describe('Meta source isolation, CSP, and server contracts', () => {
  it('keeps Pixel shell isolated to the storefront route group', () => {
    const storefrontLayout = read('src/app/(storefront)/layout.tsx');
    const rootLayout = read('src/app/layout.tsx');
    const adminLayout = read('src/app/admin/layout.tsx');
    const adminSource = walk(path.join(projectRoot, 'src/app/admin'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(storefrontLayout).toContain("from '@/components/analytics/MetaPixel'");
    expect(storefrontLayout).toContain('<MetaPixel />');
    expect(rootLayout).not.toContain('MetaPixel');
    expect(rootLayout).not.toContain('@/components/analytics');
    expect(adminLayout).not.toContain('MetaPixel');
    expect(adminLayout).not.toContain('@/components/analytics');
    expect(adminSource).not.toMatch(/fbq\(|fbevents|connect\.facebook\.net|1590827799422395/);
  });

  it('adds exact Meta CSP hosts without weakening existing security directives', () => {
    const config = read('next.config.mjs');

    expect(config).toMatch(/script-src-elem[\s\S]*https:\/\/connect\.facebook\.net/);
    expect(config).toMatch(/img-src[\s\S]*https:\/\/www\.facebook\.com/);
    expect(config).toMatch(/connect-src[\s\S]*https:\/\/www\.facebook\.com/);
    expect(config).not.toContain('*.facebook.com');
    expect(config).not.toContain('*.fbcdn.net');
    expect(config).toContain("object-src 'none'");
    expect(config).toContain("base-uri 'self'");
    expect(config).toContain("form-action 'self'");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain('https://checkout.razorpay.com');
    expect(config).toContain('https://api.razorpay.com');
    expect(config).toContain('https://*.razorpay.com');
  });

  it('documents and enforces the server-side CAPI outbox boundary', () => {
    const capi = read('src/lib/analytics/meta-capi.server.ts');
    const paymentService = read('src/lib/payments/payment-service.ts');
    const migration = read('supabase/migrations/20260816003000_add_meta_conversion_outbox.sql');
    const verifyRoute = read('src/app/api/payments/verify/route.ts');
    const webhookRoute = read('src/app/api/webhooks/razorpay/route.ts');
    const apiSource = walk(path.join(projectRoot, 'src/app/api'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(META_GRAPH_API_VERSION).toBe('v26.0');
    expect(capi).toContain("if (!serverEnv.META_CAPI_ENABLED)");
    expect(capi).toContain('META_CAPI_ACCESS_TOKEN');
    expect(capi).toContain('META_CAPI_TEST_EVENT_CODE');
    expect(capi).toContain('https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pixelId}/events');
    expect(capi).toContain("status: 'sent'");
    expect(capi).not.toContain('console.log');
    expect(paymentService).not.toContain('ensureMetaPurchaseEvent');
    expect(verifyRoute).toContain('after(async () =>');
    expect(webhookRoute).toContain('after(async () =>');
    expect(verifyRoute).toContain('ensureMetaPurchaseEvent');
    expect(webhookRoute).toContain('ensureMetaPurchaseEvent');
    expect(migration).toContain('event_id text not null unique');
    expect(migration).toContain("check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'))");
    expect(migration).toContain('event_time bigint not null check (event_time > 0)');
    expect(migration).toContain('claim_id uuid');
    expect(migration).toContain('prevent_meta_conversion_sent_regression');
    expect(migration).toContain('create or replace function public.claim_meta_conversion_event');
    expect(migration).toContain('security definer');
    expect(migration).toContain('set search_path = public');
    expect(migration).toContain("when e.status = 'sent' then 'already_sent'");
    expect(migration).toContain('event_time = coalesce(e.event_time, p_event_time)');
    expect(migration).toContain('alter table public.meta_conversion_events enable row level security');
    expect(migration).toContain('revoke all on public.meta_conversion_events from anon, authenticated');
    expect(migration).toContain('grant select, insert, update on public.meta_conversion_events to service_role');
    expect(migration).toContain(
      'grant execute on function public.claim_meta_conversion_event'
    );
    expect(apiSource).not.toMatch(/meta_conversion_events|META_CAPI_ACCESS_TOKEN|\/events\?/);
  });

  it('keeps the CAPI token out of client-facing analytics code', () => {
    const clientAnalytics = [
      read('src/lib/analytics/meta.ts'),
      read('src/components/analytics/MetaPixel.tsx'),
      read('src/components/analytics/CookieConsentBanner.tsx'),
      read('src/components/analytics/PrivacyChoices.tsx'),
      read('src/lib/env.public.ts'),
    ].join('\n');

    expect(clientAnalytics).not.toContain('META_CAPI_ACCESS_TOKEN');
    expect(clientAnalytics).not.toContain('META_CAPI_TEST_EVENT_CODE');
    expect(clientAnalytics).not.toMatch(/customer_email|customer_phone|shipping_address/);
  });

  it('prevents browser Purchase from success-page refreshes', () => {
    const successRoute = read('src/app/(storefront)/order-success/page.tsx');
    const metaClient = read('src/lib/analytics/meta.ts');

    expect(successRoute).not.toContain('trackMetaPurchase');
    expect(metaClient).toContain('gridaan_meta_purchase_sent:');
  });

  it('keeps browser and server Purchase event IDs equal', () => {
    const orderNumber = 'GR-00000003';
    const browser = buildBrowserPurchaseEvent({
      order: {
        id: 'order-id',
        order_number: orderNumber,
        customer_name: 'Aanya Sharma',
        total: 1299,
        payment_method: 'razorpay',
        payment_status: 'captured',
        order_status: 'placed',
        created_at: '2026-08-16T00:00:00.000Z',
      },
      items: [{ product: cartProduct(), quantity: 1 }],
    });
    const server = buildServerPurchaseEvent({
      orderNumber,
      value: 1299,
      items: [{ product_id: productId, quantity: 1, unit_price: 1299 }],
    });

    expect(browser.eventId).toBe(server.eventId);
  });

  it('uses checkout item snapshots for browser Purchase after payment verification', () => {
    const checkout = read('src/app/(storefront)/checkout/_view.tsx');
    const productDetail = read('src/app/(storefront)/product/[slug]/_client.tsx');
    const productCard = read('src/components/ProductCard.tsx');

    expect(checkout).toContain('const preparedCheckout = { ...data.checkout, items: checkoutItems }');
    expect(checkout).toContain('items: checkout.items?.length ? checkout.items : guest');
    expect(productDetail).toContain('trackMetaAddToCart(product, addedQuantity)');
    expect(productCard).toContain('trackMetaAddToCart(product, addedQuantity)');
    expect(productDetail).not.toContain('trackMetaAddToCart(product, quantity);');
    expect(productCard).not.toContain('trackMetaAddToCart(product, 1);');
  });
});
