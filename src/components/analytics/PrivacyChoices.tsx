'use client';

import { openPrivacyChoices } from '@/lib/analytics/consent';

export default function PrivacyChoices() {
  return (
    <button
      type="button"
      onClick={openPrivacyChoices}
      className="text-sm text-neutral-400 transition-colors hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
    >
      Privacy choices
    </button>
  );
}
