import { Star } from 'lucide-react';
import { AdminPageHeader, AdminSection, EmptyState, MetricCard, StatusBadge } from '../_components/ui';
import { getReviewsPageData } from '@/server/admin-modules';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reviews · Admin' };

export default async function ReviewsPage() {
  await requireAdminPermission('reviews.read');
  const { reviews } = await getReviewsPageData();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminPageHeader title="Reviews" description="Moderate product reviews and ratings before they become public." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Reviews" value={reviews.length.toLocaleString('en-IN')} icon={Star} tone="blue" />
        <MetricCard label="Pending" value={reviews.filter((r) => r.status === 'pending').length.toLocaleString('en-IN')} icon={Star} tone="amber" />
        <MetricCard label="Approved" value={reviews.filter((r) => r.status === 'approved').length.toLocaleString('en-IN')} icon={Star} tone="green" />
      </div>
      <AdminSection title="Review queue">
        {reviews.length ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-stone-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{review.product?.name ?? 'Product'} · {review.rating}/5</p>
                  <StatusBadge value={review.status} tone={review.status === 'approved' ? 'green' : review.status === 'rejected' ? 'red' : 'amber'} />
                </div>
                {review.title ? <p className="mt-2 text-sm font-medium">{review.title}</p> : null}
                {review.body ? <p className="mt-1 text-sm text-neutral-600">{review.body}</p> : null}
                <p className="mt-2 text-xs text-neutral-500">{formatDateTime(review.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No reviews yet" description="Customer product reviews will appear here for moderation." />
        )}
      </AdminSection>
    </div>
  );
}
