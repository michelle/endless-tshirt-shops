import type { Metadata } from 'next';
import { Suspense } from 'react';

import { OrderStatus } from '@/components/OrderStatus';
import { SiteFrame } from '@/components/SiteFrame';

export const metadata: Metadata = {
  title: 'Your order — datetime.store',
  robots: { index: false, follow: false },
};

export default function OrderPage() {
  return (
    <SiteFrame>
      <Suspense
        fallback={<div className="min-h-64 text-[var(--color-muted)]">Confirming your order…</div>}
      >
        <OrderStatus />
      </Suspense>
    </SiteFrame>
  );
}
