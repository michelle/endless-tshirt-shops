import Link from 'next/link';
import type { Metadata } from 'next';

import OrderReceipt from '@/components/OrderReceipt';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your order — datetime.store',
  robots: { index: false, follow: false },
};

/** Permalink for a purchase, so the confirmation survives a closed tab. */
export default async function OrderPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <>
      <header className="masthead">
        <div className="shell">
          <h1>
            <Link href="/" style={{ color: 'inherit' }}>
              datetime<b>.store</b>
            </Link>
          </h1>
          <p>your order</p>
        </div>
      </header>
      <main className="shell" style={{ padding: '48px 24px 72px', maxWidth: 640 }}>
        <OrderReceipt
          sessionId={sessionId}
          footer={
            <Link href="/" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              Get another shirt
            </Link>
          }
        />
      </main>
    </>
  );
}
