import { Gift } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { createServiceClient } from '@/lib/supabase/server';
import { safeAdminQuery } from '@/server/admin-modules';
import { requireAdminPagePermission } from '@/lib/admin/permissions';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Loyalty Program · Admin' };

export default async function LoyaltyPage() {
  await requireAdminPagePermission('loyalty.read');
  const supabase = createServiceClient();
  const [accounts, transactions] = await Promise.all([
    safeAdminQuery<
      { customer_id: string; points_balance: number; lifetime_earned: number; lifetime_redeemed: number; updated_at: string }[]
    >('loyalty-accounts', supabase.from('loyalty_accounts').select('*').order('updated_at', { ascending: false }).limit(100), []),
    safeAdminQuery<
      { id: string; customer_id: string; order_id: string | null; transaction_type: string; points: number; balance_after: number; reason: string; expires_at: string | null; created_at: string }[]
    >('loyalty-transactions', supabase.from('loyalty_transactions').select('*').order('created_at', { ascending: false }).limit(100), []),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Loyalty Program"
        description="Earn points after successful delivery, redeem at checkout, expire old points, and record manual admin adjustments with reasons."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Accounts" value={accounts.length.toLocaleString('en-IN')} icon={Gift} tone="blue" />
        <MetricCard label="Points balance" value={accounts.reduce((sum, account) => sum + account.points_balance, 0).toLocaleString('en-IN')} icon={Gift} tone="gold" />
        <MetricCard label="Transactions" value={transactions.length.toLocaleString('en-IN')} icon={Gift} tone="green" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSection title="Loyalty accounts">
          {accounts.length ? (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.customer_id} className="rounded-lg border border-stone-100 p-3">
                  <p className="font-mono text-xs text-neutral-500">{account.customer_id}</p>
                  <p className="mt-1 text-sm font-semibold">{account.points_balance.toLocaleString('en-IN')} points</p>
                  <p className="text-xs text-neutral-500">Earned {account.lifetime_earned} · Redeemed {account.lifetime_redeemed}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No loyalty accounts yet" description="Accounts are created when customers enter the loyalty program." />
          )}
        </AdminSection>
        <AdminSection title="Transaction ledger">
          {transactions.length ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-lg border border-stone-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{transaction.points.toLocaleString('en-IN')} points</p>
                    <StatusBadge value={transaction.transaction_type} tone="gold" />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{transaction.reason}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Balance {transaction.balance_after} · {formatDateTime(transaction.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No loyalty transactions" description="Earned, redeemed, expired, adjusted and reversed points will appear here." />
          )}
        </AdminSection>
      </div>
    </div>
  );
}
