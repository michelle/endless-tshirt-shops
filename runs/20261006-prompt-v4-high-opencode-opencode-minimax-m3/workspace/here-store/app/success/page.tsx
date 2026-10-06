import Link from 'next/link';
import { orders } from '@/lib/orders';
import { getStripe } from '@/lib/stripe';
import { isMockPayments } from '@/lib/config';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: {
    session?: string;
    order?: string;
    mock?: string;
  };
}

export default async function SuccessPage({ searchParams }: Props) {
  const order = searchParams.order
    ? orders.get(searchParams.order)
    : searchParams.session
    ? orders.bySession(searchParams.session)
    : undefined;

  let paymentSummary: { amount: string; email?: string | null; status?: string } | null = null;
  if (searchParams.session && !isMockPayments() && !searchParams.mock && getStripe()) {
    try {
      const s = await getStripe()!.checkout.sessions.retrieve(searchParams.session);
      paymentSummary = {
        amount: s.amount_total ? (s.amount_total / 100).toFixed(2) : '',
        email: s.customer_details?.email ?? s.customer_email,
        status: s.payment_status ?? undefined,
      };
    } catch { /* swallow */ }
  } else if (isMockPayments() || searchParams.mock) {
    paymentSummary = { amount: '34.99', email: '—', status: 'paid (mock)' };
  }

  return (
    <div className="bg-bone">
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-rust">Paid</div>
        <h1 className="font-serif text-5xl mt-2 tracking-tight">Order placed.</h1>
        <p className="text-ink/70 mt-3 max-w-md mx-auto">
          We're sending your design to <span className="font-mono">Prodigi</span> right now.
          You'll get a tracking link in your inbox when it ships (3–5 business days, typically).
        </p>
        {paymentSummary && (
          <div className="mt-8 inline-flex items-baseline gap-3 border border-ink/10 rounded-full px-6 py-3 bg-white">
            <span className="font-mono text-xs uppercase tracking-widest text-ink/50">Total</span>
            <span className="font-serif text-2xl">${paymentSummary.amount}</span>
            {paymentSummary.status && (
              <span className="font-mono text-xs uppercase tracking-widest text-rust">· {paymentSummary.status}</span>
            )}
          </div>
        )}
        {order && (
          <div className="mt-8 text-left bg-white border border-ink/10 rounded-2xl p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Your design</div>
            <div className="font-serif text-2xl mt-1">{order.design.label}</div>
            <div className="text-ink/70">{order.design.city}</div>
            <div className="font-mono text-sm text-ink/70 mt-2">
              {order.design.latitude.toFixed(4)}°, {order.design.longitude.toFixed(4)}°
            </div>
            <div className="text-xs text-ink/60 mt-3">
              {order.shipping.name} · {order.shipping.city}, {order.shipping.countryCode}
            </div>
            <div className="text-[11px] font-mono text-ink/40 mt-2">
              order #{order.id.slice(0, 8)} · status: {order.status}
            </div>
          </div>
        )}
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/" className="border border-ink/20 px-5 py-3 rounded-full hover:border-ink/60">Back to homepage</Link>
          <Link href="/design" className="bg-ink text-bone px-5 py-3 rounded-full hover:bg-rust">Make another</Link>
        </div>
      </div>
    </div>
  );
}
