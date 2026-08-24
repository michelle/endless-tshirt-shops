import { Suspense } from 'react';
import OrderStatus from '@/components/OrderStatus';

export const metadata = { title: 'Your order — the datetime store' };

export default function OrderPage() {
  return (
    <main className="order">
      <Suspense fallback={<p>Loading your order…</p>}>
        <OrderStatus />
      </Suspense>
    </main>
  );
}
