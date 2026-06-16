import OrdersAdmin from './_client';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminWhatsAppNumber } from '@/lib/whatsapp';
import type { Order } from '@/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Orders · Admin' };

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const supabase = createServiceClient();
  const { page } = await searchParams;
  const pageNumber = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
  const from = (pageNumber - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: orders, count } = await supabase
    .from('orders')
    .select('*, items:order_items(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  return (
    <OrdersAdmin
      orders={(orders ?? []) as Order[]}
      adminWhatsappNumber={getAdminWhatsAppNumber()}
      page={pageNumber}
      pageSize={PAGE_SIZE}
      totalCount={count ?? 0}
      hasMore={to + 1 < (count ?? 0)}
    />
  );
}
