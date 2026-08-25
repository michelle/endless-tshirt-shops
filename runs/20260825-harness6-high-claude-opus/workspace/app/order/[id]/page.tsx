import Link from 'next/link';

import { OrderStatus } from '@/components/OrderStatus';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="shell">
      <header className="masthead">
        <h1>
          <Link href="/" style={{ color: 'inherit', borderBottom: 0 }}>
            datetime.store
          </Link>
        </h1>
        <p>your order</p>
      </header>
      <OrderStatus paymentIntentId={id} />
    </main>
  );
}
