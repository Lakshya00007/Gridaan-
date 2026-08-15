'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_PREFERENCES_EVENT,
  getBrowserConsentState,
  saveBrowserConsent,
  type ConsentState,
} from '@/lib/analytics/consent';

export default function CookieConsentBanner() {
  const [state, setState] = useState<ConsentState>(() => ({
    necessary: true,
    marketing: false,
    hasDecision: true,
    requiresConsent: false,
    record: null,
  }));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setState(getBrowserConsentState());
    const openPreferences = () => {
      refresh();
      setOpen(true);
    };

    refresh();
    window.addEventListener(CONSENT_CHANGED_EVENT, refresh);
    window.addEventListener(CONSENT_PREFERENCES_EVENT, openPreferences);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, refresh);
      window.removeEventListener(CONSENT_PREFERENCES_EVENT, openPreferences);
    };
  }, []);

  const visible = open || state.requiresConsent;
  if (!visible) return null;

  function decide(marketing: boolean) {
    saveBrowserConsent(marketing);
    setOpen(false);
    setState(getBrowserConsentState());
  }

  return (
    <section
      aria-label="Privacy choices"
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-2xl border border-stone-200 bg-white/95 p-4 text-neutral-950 shadow-[0_22px_70px_-36px_rgba(23,18,10,0.55)] backdrop-blur-xl sm:bottom-5 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-950">Privacy choices</p>
          <p className="mt-1 text-xs leading-5 text-neutral-600 sm:text-sm sm:leading-6">
            Necessary storage keeps cart, checkout, authentication, security and payments working.
            Marketing analytics stays off unless you accept it.
            Read the <Link href="/privacy" className="font-semibold text-gold-700 hover:text-gold-800">Privacy Policy</Link>.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => decide(false)}
            className="min-h-11 rounded-xl border border-stone-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-100"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            className="min-h-11 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-200"
          >
            Accept
          </button>
        </div>
      </div>
    </section>
  );
}
