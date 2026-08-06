export function maskAdminPhone(phone: string | null | undefined) {
  if (!phone) return 'Not provided';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `••••••${digits.slice(-4)}`;
}
