export function getSafeAuthRedirect(value: string | null | undefined, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) {
    return fallback;
  }
  try {
    const base = 'https://gridaan.invalid';
    const target = new URL(value, base);
    if (target.origin !== base || target.pathname === '/login' || target.pathname.startsWith('/auth/')) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
