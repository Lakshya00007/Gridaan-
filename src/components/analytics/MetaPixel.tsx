'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  ensureMetaPixel,
  META_PIXEL_READY_EVENT,
  revokeMetaConsentIfLoaded,
  trackMetaPageView,
} from '@/lib/analytics/meta';
import { CONSENT_CHANGED_EVENT, getBrowserConsentState } from '@/lib/analytics/consent';

export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    function syncPixel() {
      const consent = getBrowserConsentState();
      if (!consent.marketing) {
        revokeMetaConsentIfLoaded();
        return;
      }
      ensureMetaPixel();
      if (pathname) trackMetaPageView(pathname);
    }

    syncPixel();
    window.addEventListener(CONSENT_CHANGED_EVENT, syncPixel);
    window.addEventListener(META_PIXEL_READY_EVENT, syncPixel);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, syncPixel);
      window.removeEventListener(META_PIXEL_READY_EVENT, syncPixel);
    };
  }, [pathname]);

  return null;
}
