import { Suspense } from 'react';
import OrderView from '@/components/OrderView';

export const dynamic = 'force-dynamic';

export default function OrderPage() {
  return (
    <main className="order-wrap">
      <Suspense fallback={<p className="note">Fetching the ledger...</p>}>
        <OrderView />
      </Suspense>
    </main>
  );
}
