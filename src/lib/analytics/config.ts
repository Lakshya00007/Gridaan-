export const META_PIXEL_ID = '1590827799422395';
export const META_GRAPH_API_VERSION = 'v26.0';
export const META_PRODUCTION_HOST = 'www.gridaan.com';
export const META_DEBUG_NON_PRODUCTION_STORAGE_KEY = 'gridaan_meta_debug_allow_non_production';

export function isValidMetaPixelId(value: string | null | undefined) {
  return /^\d{5,30}$/.test(String(value ?? '').trim());
}

export function isMetaProductionHost(hostname: string | null | undefined) {
  return String(hostname ?? '').toLowerCase() === META_PRODUCTION_HOST;
}

export function isBlockedMetaHost(hostname: string | null | undefined) {
  const host = String(hostname ?? '').toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.vercel.app')
  );
}

export function canActivateMetaPixel({
  pixelId,
  hostname,
  marketingConsent,
  allowNonProduction = false,
  debugAllowNonProduction = false,
  testMode = false,
}: {
  pixelId?: string | null;
  hostname?: string | null;
  marketingConsent: boolean;
  allowNonProduction?: boolean;
  debugAllowNonProduction?: boolean;
  testMode?: boolean;
}) {
  if (testMode) return false;
  if (!marketingConsent) return false;
  if (!isValidMetaPixelId(pixelId)) return false;
  if (isMetaProductionHost(hostname)) return true;
  if (allowNonProduction && debugAllowNonProduction) return true;
  return false;
}
