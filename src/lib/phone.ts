export const INDIAN_PHONE_ERROR = 'Enter a valid 10-digit Indian mobile number';

export function normalizeIndianPhone(input: string): string | null {
  let value = String(input).trim().replace(/[\s()-]/g, '');

  if (value.startsWith('+91')) {
    value = value.slice(3);
  } else if (/^91\d{10}$/.test(value)) {
    value = value.slice(2);
  } else if (/^0\d{10}$/.test(value)) {
    value = value.slice(1);
  }

  return /^[6-9]\d{9}$/.test(value) ? value : null;
}
