export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = 'gridaan_consent_v1';
export const CONSENT_CHANGED_EVENT = 'gridaan:consent-changed';
export const CONSENT_PREFERENCES_EVENT = 'gridaan:open-privacy-choices';

export type ConsentRecord = {
  version: 1;
  necessary: true;
  marketing: boolean;
  decidedAt: string;
};

export type ConsentState = {
  necessary: true;
  marketing: boolean;
  hasDecision: boolean;
  requiresConsent: boolean;
  record: ConsentRecord | null;
};

export type ConsentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function isConsentRecord(value: unknown): value is ConsentRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === CONSENT_VERSION &&
    record.necessary === true &&
    typeof record.marketing === 'boolean' &&
    typeof record.decidedAt === 'string' &&
    Number.isFinite(Date.parse(record.decidedAt))
  );
}

export function parseConsentRecord(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isConsentRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readConsentFromStorage(storage: ConsentStorage | null | undefined): ConsentRecord | null {
  if (!storage) return null;
  return parseConsentRecord(storage.getItem(CONSENT_STORAGE_KEY));
}

export function getConsentState(storage: ConsentStorage | null | undefined): ConsentState {
  const record = readConsentFromStorage(storage);
  return {
    necessary: true,
    marketing: record?.marketing ?? false,
    hasDecision: Boolean(record),
    requiresConsent: !record,
    record,
  };
}

export function createConsentRecord(marketing: boolean, decidedAt = new Date().toISOString()): ConsentRecord {
  return {
    version: CONSENT_VERSION,
    necessary: true,
    marketing,
    decidedAt,
  };
}

export function writeConsentToStorage(
  storage: ConsentStorage,
  marketing: boolean,
  decidedAt = new Date().toISOString()
) {
  const record = createConsentRecord(marketing, decidedAt);
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  return record;
}

export function clearConsentStorage(storage: ConsentStorage) {
  storage.removeItem(CONSENT_STORAGE_KEY);
}

export function getBrowserConsentState() {
  if (typeof window === 'undefined') return getConsentState(null);
  return getConsentState(window.localStorage);
}

export function saveBrowserConsent(marketing: boolean) {
  if (typeof window === 'undefined') return null;
  const record = writeConsentToStorage(window.localStorage, marketing);
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: record }));
  return record;
}

export function openPrivacyChoices() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CONSENT_PREFERENCES_EVENT));
}

export function subscribeToConsentChanges(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CONSENT_CHANGED_EVENT, listener);
  window.addEventListener(CONSENT_PREFERENCES_EVENT, listener);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, listener);
    window.removeEventListener(CONSENT_PREFERENCES_EVENT, listener);
  };
}

export function getCheckoutConsentSnapshot(storage: ConsentStorage | null | undefined) {
  const state = getConsentState(storage);
  return {
    version: CONSENT_VERSION,
    marketing: state.marketing,
    decided_at: state.record?.decidedAt ?? null,
  };
}
