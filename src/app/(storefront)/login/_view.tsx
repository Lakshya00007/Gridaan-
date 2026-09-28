'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Loader2, Mail } from 'lucide-react';
import { getSafeAuthRedirect } from '@/lib/auth-navigation';

export default function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const next = getSafeAuthRedirect(params.get('next'));
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(codeSent ? '/api/auth/email/verify' : '/api/auth/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codeSent ? { email, token } : { email }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Please try again.');
      if (codeSent) {
        router.replace(next);
        router.refresh();
      } else {
        setCodeSent(true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-warm-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <Link href="/" className="heading-display mb-6 inline-block text-2xl">Gridaan</Link>
          <h1 className="heading-display text-xl text-neutral-900">Sign in with email</h1>
          <p className="mt-2 text-sm text-neutral-500">
            {codeSent ? `Enter the six-digit code sent to ${email}.` : 'We will email you a one-time code to verify your address.'}
          </p>
        </div>
        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          {!codeSent ? (
            <label className="relative block">
              <span className="sr-only">Email address</span>
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" required className="w-full rounded-xl border border-neutral-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-gold-400" />
            </label>
          ) : (
            <label className="block">
              <span className="mb-2 block text-sm text-neutral-600">Verification code</span>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, ''))} required className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-gold-400" />
            </label>
          )}
          <button type="submit" disabled={busy} className="btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{codeSent ? 'Verify and continue' : 'Email me a code'}
          </button>
        </form>
        {codeSent && <button type="button" onClick={() => { setCodeSent(false); setToken(''); setError(''); }} className="mt-4 w-full text-center text-sm text-gold-700 hover:underline">Change email or request a new code</button>}
        <p className="mt-6 text-center text-xs text-neutral-500">By continuing you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
      </div>
    </div>
  );
}
