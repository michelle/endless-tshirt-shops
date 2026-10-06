import { Footer, Nav } from '@/components/SiteChrome';
import { config, originFromHeaders } from '@/lib/config.js';
import { fulfillStripeSession } from '@/lib/payments.js';
import { findOrderByReference } from '@/lib/prodigi.js';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const metadata = { title: 'Order confirmed — Skyprint' };

async function load(sp, origin) {
  if (sp.session_id && config.stripeEnabled) {
    // Idempotent: the webhook normally got here first; this covers a late or missing webhook.
    const r = await fulfillStripeSession(String(sp.session_id), origin);
    if (r.ok) return { state: 'ok', order: r.order, ref: r.ref, email: r.session.customer_details?.email };
    if (r.reason === 'unpaid') return { state: 'unpaid' };
    return { state: 'problem', ref: String(sp.session_id) };
  }
  if (sp.ref && config.demoPayments && String(sp.ref).startsWith('demo_')) {
    const order = await findOrderByReference(String(sp.ref));
    if (order) return { state: 'ok', order, ref: String(sp.ref), demo: true };
  }
  return { state: 'missing' };
}

export default async function Success({ searchParams }) {
  const sp = await searchParams;
  const origin = originFromHeaders(await headers());
  const res = await load(sp, origin);
  const order = res.order;
  return (
    <>
      <Nav />
      <main className="page">
        {res.state === 'ok' && (
          <>
            <div className="eyebrow">{res.demo ? 'Test order (sandbox)' : 'Payment received'}</div>
            <h1>Your sky is on its way to the printer.</h1>
            <p>
              {res.demo
                ? 'This was a sandbox test: no payment was taken and nothing will be shipped. The order below was created in the print provider’s sandbox.'
                : `Thank you! We’ve sent your design to production${res.email ? ` and will use ${res.email} for updates` : ''}. Shirts are printed to order and usually arrive in 5–12 business days.`}
            </p>
            <dl className="kv">
              <dt>Order reference</dt><dd>{res.ref}</dd>
              <dt>Print order</dt><dd>{order.id}</dd>
              <dt>Status</dt><dd>{order.status?.stage}</dd>
              <dt>Ship to</dt><dd>{[order.recipient?.name, order.recipient?.address?.townOrCity, order.recipient?.address?.countryCode].filter(Boolean).join(', ')}</dd>
              {order.shipments?.[0]?.tracking?.url && <><dt>Tracking</dt><dd><a href={order.shipments[0].tracking.url}>{order.shipments[0].tracking.number || 'Track parcel'}</a></dd></>}
            </dl>
            <p>Bookmark this page to check on your order later.</p>
            <a className="btn" href="/">Design another</a>
          </>
        )}
        {res.state === 'unpaid' && (<><h1>Payment not completed</h1><p>We haven’t received payment for this order, so nothing has been sent to print. You can try again from the designer — your design is saved.</p><a className="btn" href="/#design">Back to designer</a></>)}
        {res.state === 'problem' && (<><h1>We’re finishing your order</h1><p>Your payment went through, but we hit a snag passing your order to the printer. Don’t worry — it will be retried automatically. If you don’t hear from us shortly, reply to your payment receipt quoting <strong>{res.ref}</strong>.</p></>)}
        {res.state === 'missing' && (<><h1>Order not found</h1><p>We couldn’t find that order. If you just paid, refresh this page in a moment.</p><a className="btn" href="/">Back to the store</a></>)}
      </main>
      <Footer />
    </>
  );
}
