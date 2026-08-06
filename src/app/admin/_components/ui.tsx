import Link from 'next/link';
import { AlertCircle, Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn, formatRupees } from '@/lib/utils';

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-neutral-950">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p> : null}
      </div>
      {action ? <div className="max-w-full shrink-0">{action}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'neutral' | 'gold' | 'green' | 'red' | 'blue' | 'amber';
}) {
  const tones = {
    neutral: 'bg-neutral-950 text-white',
    gold: 'bg-gold-100 text-gold-800',
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-[0_16px_34px_-30px_rgba(53,38,18,0.34)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-xl font-bold text-neutral-950">{value}</p>
    </div>
  );
}

export function StatusBadge({ value, tone = 'neutral' }: { value: string; tone?: 'neutral' | 'green' | 'red' | 'blue' | 'amber' | 'gold' }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    gold: 'bg-gold-100 text-gold-800',
  };

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold', tones[tone])}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <Inbox className="mx-auto mb-3 h-5 w-5 text-stone-400" aria-hidden="true" />
      <h3 className="font-semibold text-neutral-950">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading admin data">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-lg bg-stone-100 motion-reduce:animate-none" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function AdminErrorState({
  title = 'Unable to load this page',
  description = 'The admin data request could not be completed. Try again in a moment.',
  retry,
}: {
  title?: string;
  description?: string;
  retry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-white px-6 py-12 text-center" role="alert">
      <AlertCircle className="mx-auto mb-3 h-6 w-6 text-red-600" aria-hidden="true" />
      <h2 className="font-semibold text-neutral-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">{description}</p>
      {retry ? (
        <button
          type="button"
          onClick={retry}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:ring-4 focus-visible:ring-gold-200"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function AdminSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-stone-200 bg-white shadow-[0_16px_34px_-30px_rgba(53,38,18,0.34)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-neutral-950">{title}</h2>
          {description ? <p className="mt-1 text-xs text-neutral-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="min-w-0 p-4">{children}</div>
    </section>
  );
}

export function MiniBarChart({
  data,
  valuePrefix,
}: {
  data: { label: string; value: number }[];
  valuePrefix?: 'inr';
}) {
  const max = Math.max(...data.map((item) => item.value), 0);
  if (data.length === 0 || max === 0) {
    return <EmptyState title="No data yet" description="This chart will populate when matching records exist." />;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-neutral-600">{item.label}</span>
            <span className="font-semibold text-neutral-950">
              {valuePrefix === 'inr' ? formatRupees(item.value) : item.value.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-gold-500"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminLinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:ring-4 focus-visible:ring-gold-200"
    >
      {children}
    </Link>
  );
}
