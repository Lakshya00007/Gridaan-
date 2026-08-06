import { Settings } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { getSettingsPageData } from '@/server/admin-modules';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings · Admin' };

const plannedSections = [
  {
    section: 'Store',
    items: ['Business name', 'Support email', 'Support phone', 'Store URL', 'Currency', 'Time zone'],
  },
  {
    section: 'Orders',
    items: ['Order number prefix', 'Stock reservation period', 'Cancellation rules', 'COD disabled'],
  },
  {
    section: 'Payments',
    items: ['Active provider', 'Test/live indicator', 'Enabled payment methods', 'Manual payment enabled', 'Webhook status'],
  },
  {
    section: 'Shipping',
    items: ['Standard shipping fee', 'Free-shipping threshold', 'Estimated delivery days'],
  },
  {
    section: 'Inventory',
    items: ['Default low-stock threshold', 'Allow backorders'],
  },
  {
    section: 'Loyalty',
    items: ['Points earning rate', 'Redemption value', 'Expiry period'],
  },
];

export default async function SettingsPage() {
  await requireAdminPermission('settings.read');
  const { settings } = await getSettingsPageData();
  const visibleSettings = settings.filter((setting) => !setting.is_secret);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Settings"
        description="Operational store configuration. Razorpay secrets and other raw credentials are intentionally excluded from normal settings records."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Configured values" value={visibleSettings.length.toLocaleString('en-IN')} icon={Settings} tone="blue" />
        <MetricCard label="Sections" value={new Set(visibleSettings.map((setting) => setting.section)).size.toLocaleString('en-IN')} icon={Settings} tone="gold" />
        <MetricCard label="Secrets stored here" value="0" icon={Settings} tone="green" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <AdminSection title="Saved settings">
          {visibleSettings.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left">
                <thead>
                  <tr className="border-b border-stone-100 text-xs text-neutral-500">
                    <th className="py-3 pr-4 font-semibold">Key</th>
                    <th className="py-3 pr-4 font-semibold">Section</th>
                    <th className="py-3 pr-4 font-semibold">Value</th>
                    <th className="py-3 pr-4 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSettings.map((setting) => (
                    <tr key={setting.key} className="border-b border-stone-50 text-sm">
                      <td className="py-3 pr-4 font-semibold">{setting.key}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge value={setting.section} tone="gold" />
                      </td>
                      <td className="max-w-xs truncate py-3 pr-4 text-neutral-600">
                        {JSON.stringify(setting.value)}
                      </td>
                      <td className="py-3 pr-4 text-xs text-neutral-500">{formatDateTime(setting.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No settings saved yet" description="Defaults remain code/env-driven until store settings are explicitly configured." />
          )}
        </AdminSection>

        <AdminSection title="Configuration areas">
          <div className="space-y-4">
            {plannedSections.map((group) => (
              <div key={group.section} className="rounded-lg border border-stone-100 p-3">
                <p className="font-semibold text-neutral-950">{group.section}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span key={item} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
