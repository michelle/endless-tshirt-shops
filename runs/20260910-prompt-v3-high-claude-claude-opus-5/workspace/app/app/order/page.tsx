import type { Metadata } from 'next';
import OrderView from './OrderView';

export const metadata: Metadata = {
  title: 'Your order — Flora Personalis',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  return <OrderView sessionId={params.session_id ?? null} />;
}
