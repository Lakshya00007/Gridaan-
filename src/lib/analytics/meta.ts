'use client';

import { publicEnv } from '@/lib/env.public';
import {
  canActivateMetaPixel,
  META_DEBUG_NON_PRODUCTION_STORAGE_KEY,
} from './config';
import { getBrowserConsentState } from './consent';
import {
  buildAddToCartEvent,
  buildBrowserPurchaseEvent,
  buildInitiateCheckoutEvent,
  buildViewContentEvent,
  type MetaEcommerceEventData,
  type MetaStandardEventName,
} from './meta-events';
import type { CartProductSnapshot, OrderSuccessSummary, Product } from '@/types';

export const META_PIXEL_READY_EVENT = 'gridaan:meta-pixel-ready';
const META_SCRIPT_ID = 'gridaan-meta-pixel-sdk';
const PURCHASE_SENT_PREFIX = 'gridaan_meta_purchase_sent:';

type FbqCommand =
  | ['init', string]
  | ['track', MetaStandardEventName, MetaEcommerceEventData?]
  | ['track', MetaStandardEventName, MetaEcommerceEventData | undefined, { eventID: string }]
  | ['consent', 'grant' | 'revoke'];

type FbqFunction = {
  (...args: FbqCommand): void;
  callMethod?: (...args: FbqCommand) => void;
  queue: FbqCommand[];
  loaded: boolean;
  version: string;
  push: FbqFunction;
};

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
    __gridaanMetaPixel?: {
      initializedPixelId?: string;
      scriptInjected?: boolean;
      lastTrackedPath?: string;
    };
  }
}

function isBrowserTestMode() {
  return process.env.NODE_ENV === 'test';
}

function getDebugAllowNonProduction() {
  try {
    return window.localStorage.getItem(META_DEBUG_NON_PRODUCTION_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isMetaPixelRuntimeAllowed() {
  if (typeof window === 'undefined') return false;
  const consent = getBrowserConsentState();
  return canActivateMetaPixel({
    pixelId: publicEnv.NEXT_PUBLIC_META_PIXEL_ID,
    hostname: window.location.hostname,
    marketingConsent: consent.marketing,
    allowNonProduction: publicEnv.NEXT_PUBLIC_META_ALLOW_NON_PRODUCTION,
    debugAllowNonProduction: getDebugAllowNonProduction(),
    testMode: isBrowserTestMode(),
  });
}

function installFbqQueue() {
  if (window.fbq) return window.fbq;

  const fbq = ((...args: FbqCommand) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
      return;
    }
    fbq.queue.push(args);
  }) as FbqFunction;

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  return fbq;
}

export function grantMetaConsentIfLoaded() {
  if (typeof window === 'undefined') return;
  window.fbq?.('consent', 'grant');
}

export function revokeMetaConsentIfLoaded() {
  if (typeof window === 'undefined') return;
  window.fbq?.('consent', 'revoke');
}

export function ensureMetaPixel() {
  if (typeof window === 'undefined') return false;
  if (!isMetaPixelRuntimeAllowed()) {
    revokeMetaConsentIfLoaded();
    return false;
  }

  const pixelId = publicEnv.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return false;

  const state = (window.__gridaanMetaPixel ??= {});
  const fbq = installFbqQueue();
  fbq('consent', 'grant');

  if (state.initializedPixelId !== pixelId) {
    fbq('init', pixelId);
    state.initializedPixelId = pixelId;
  }

  if (!state.scriptInjected && !document.getElementById(META_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = META_SCRIPT_ID;
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.onload = () => window.dispatchEvent(new Event(META_PIXEL_READY_EVENT));
    script.onerror = () => window.dispatchEvent(new Event(META_PIXEL_READY_EVENT));
    document.head.appendChild(script);
    state.scriptInjected = true;
  } else {
    window.dispatchEvent(new Event(META_PIXEL_READY_EVENT));
  }

  return true;
}

export function trackMetaStandardEvent(
  eventName: MetaStandardEventName,
  data?: MetaEcommerceEventData,
  options: { eventId?: string } = {}
) {
  try {
    if (!isMetaPixelRuntimeAllowed()) return false;
    if (!window.fbq && !ensureMetaPixel()) return false;
    if (!window.fbq) return false;
    if (options.eventId) {
      window.fbq('track', eventName, data, { eventID: options.eventId });
    } else {
      window.fbq('track', eventName, data);
    }
    return true;
  } catch {
    return false;
  }
}

export function trackMetaPageView(pathname: string) {
  if (typeof window === 'undefined') return false;
  if (!ensureMetaPixel()) return false;
  const state = (window.__gridaanMetaPixel ??= {});
  if (state.lastTrackedPath === pathname) return false;
  const tracked = trackMetaStandardEvent('PageView');
  if (tracked) state.lastTrackedPath = pathname;
  return tracked;
}

export function trackMetaViewContent(product: Product) {
  return trackMetaStandardEvent('ViewContent', buildViewContentEvent(product));
}

export function trackMetaAddToCart(product: Product, quantity: number) {
  return trackMetaStandardEvent('AddToCart', buildAddToCartEvent(product, quantity));
}

export function trackMetaInitiateCheckout({
  items,
  value,
}: {
  items: Array<{ product: CartProductSnapshot; quantity: number }>;
  value: number;
}) {
  return trackMetaStandardEvent('InitiateCheckout', buildInitiateCheckoutEvent({ items, value }));
}

export function trackMetaPurchase({
  order,
  items,
}: {
  order: OrderSuccessSummary;
  items: Array<{ product: CartProductSnapshot; quantity: number }>;
}) {
  if (typeof window === 'undefined') return false;
  const purchase = buildBrowserPurchaseEvent({ order, items });
  const storageKey = `${PURCHASE_SENT_PREFIX}${purchase.eventId}`;
  try {
    if (window.localStorage.getItem(storageKey)) return false;
  } catch {
    return false;
  }
  const tracked = trackMetaStandardEvent('Purchase', purchase.data, { eventId: purchase.eventId });
  if (tracked) {
    try {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      return tracked;
    }
  }
  return tracked;
}
