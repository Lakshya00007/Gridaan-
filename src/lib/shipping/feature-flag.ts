export function parseServerFeatureFlag(value: string | undefined | null) {
  return String(value ?? 'false').trim().toLowerCase() === 'true';
}
