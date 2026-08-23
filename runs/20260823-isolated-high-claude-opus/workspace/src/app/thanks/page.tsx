import { Suspense } from 'react';
import { Masthead, StoreFooter, TestModeBanner } from '@/components/Chrome';
import { OrderStatus } from '@/components/OrderStatus';
import { chivo } from '@/lib/font';

export const metadata = { title: 'Congrats on your pretty cool shirt! — datetime.store' };

export default function ThanksPage() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  return (
    <>
      <TestModeBanner publishableKey={publishableKey} />
      <main className="page">
        <Masthead />
        <Suspense fallback={<p className="locked">Looking up your order…</p>}>
          <OrderStatus font={chivo.style.fontFamily} />
        </Suspense>
        <StoreFooter />
      </main>
    </>
  );
}
