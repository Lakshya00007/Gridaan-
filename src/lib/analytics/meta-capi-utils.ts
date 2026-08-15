import { createHash } from 'node:crypto';
import { CONSENT_VERSION } from './consent';
import { normalizeIndianPhone } from '@/lib/phone';

export function normalizeEmailForMeta(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized && normalized.includes('@') ? normalized : null;
}

export function normalizePhoneForMeta(value: string | null | undefined) {
  const normalized = normalizeIndianPhone(value ?? '');
  return normalized ? `91${normalized}` : null;
}

export function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function getMetaUserData({
  email,
  phone,
}: {
  email?: string | null;
  phone?: string | null;
}) {
  const normalizedEmail = normalizeEmailForMeta(email);
  const normalizedPhone = normalizePhoneForMeta(phone);
  return {
    ...(normalizedEmail ? { em: [sha256Hex(normalizedEmail)] } : {}),
    ...(normalizedPhone ? { ph: [sha256Hex(normalizedPhone)] } : {}),
  };
}

export function hasOrderMarketingConsent(metadata: Record<string, unknown> | null | undefined) {
  const consent = metadata?.marketing_consent;
  if (!consent || typeof consent !== 'object') return false;
  const record = consent as Record<string, unknown>;
  return record.version === CONSENT_VERSION && record.marketing === true;
}
