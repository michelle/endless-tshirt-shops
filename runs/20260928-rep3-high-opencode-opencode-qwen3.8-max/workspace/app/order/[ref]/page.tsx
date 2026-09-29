import Link from 'next/link';
import DesignPreview from '@/components/DesignPreview';
import { fulfillPaidSession, parseSessionDesign } from '@/lib/fulfillment';
import { getProdigiOrder, type ProdigiOrder } from '@/lib/prodigi';
import { stripe } from '@/lib/stripe';
import type { DesignParams, Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface View {
  kind: 'not-found' | 'found';
  reference?: string;
  paid?: boolean;
  amount?: string;
  email?: string | null;
  created?: string;
  shippingName?: string;
  shippingAddress?: string;
  design?: DesignParams;
  product?: Product;
  prodigiOrderId?: string;
  prodigi?: ProdigiOrder;
  prodigiError?: string;
  fulfillError?: string;
}

async function load(ref: string): Promise<View> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(ref)) return { kind: 'not-found' };
  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(ref);
  } catch {
    return { kind: 'not-found' };
  }

  const view: View = {
    kind: 'found',
    reference: ref,
    paid: session.payment_status === 'paid',
    amount:
      session.amount_total != null
        ? `$${(session.amount_total / 100).toFixed(2)} ${(session.currency ?? 'usd').toUpperCase()}`
        : undefined,
    email: session.customer_details?.email ?? session.customer_email,
    created: session.created ? new Date(session.created * 1000).toISOString() : undefined,
    shippingName: session.shipping_details?.name,
    shippingAddress: session.shipping_details?.address
      ? [
          session.shipping_details.address.line1,
          session.shipping_details.address.line2,
          session.shipping_details.address.city,
          session.shipping_details.address.state,
          session.shipping_details.address.postal_code,
          session.shipping_details.address.country,
        ]
          .filter(Boolean)
          .join(', ')
      : undefined,
  };

  try {
    const { design, product } = parseSessionDesign(session);
    view.design = design;
    view.product = product;
  } catch {
    /* metadata missing */
  }

  if (view.paid) {
    // Idempotent reconciliation: covers webhooks that never arrived.
    const result = await fulfillPaidSession(ref);
    if (result.status === 'error') view.fulfillError = result.error;
    const prodigiOrderId =
      result.status === 'fulfilled' || result.status === 'already_fulfilled'
        ? result.prodigiOrderId
        : session.metadata?.prodigiOrderId;
    if (prodigiOrderId) {
      view.prodigiOrderId = prodigiOrderId;
      try {
        const res = await getProdigiOrder(prodigiOrderId);
        view.prodigi = res.order;
      } catch (e) {
        view.prodigiError = (e as Error).message;
      }
    }
  }
  return view;
}

const STAGES: [string, string][] = [
  ['downloadAssets', 'Artwork delivered to the lab'],
  ['printReadyAssetsPrepared', 'Artwork prepared for print'],
  ['allocateProductionLocation', 'Assigned to a print lab'],
  ['inProduction', 'Printing your shirt'],
  ['shipping', 'Shipped'],
];

export default async function OrderPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const v = await load(ref);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/">
          STARRYBORN
          <small>wear the night you were born</small>
        </a>
        <nav>
          <Link href="/#studio">Design yours</Link>
          <Link href="/info">Details</Link>
        </nav>
      </header>

      <div className="order-wrap">
        {v.kind === 'not-found' ? (
          <div className="panel">
            <h1 style={{ marginTop: 0 }}>Order not found</h1>
            <p>
              We couldn’t find an order with that reference. Order links look like{' '}
              <code>/order/cs_test_…</code> and arrive right after checkout.
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>
              {v.paid ? 'Your sky is on its way.' : 'Checkout not completed.'}
            </h1>
            <div className="order-status">
              <span className={`status-chip ${v.paid ? 'ok' : 'warn'}`}>
                {v.paid ? '✓ PAID' : 'AWAITING PAYMENT'}
              </span>
              {v.prodigiOrderId && (
                <span className="status-chip ok">PRINT ORDER {v.prodigiOrderId.toUpperCase()}</span>
              )}
              {v.prodigi && (
                <span
                  className={`status-chip ${
                    v.prodigi.status.stage === 'Complete'
                      ? 'ok'
                      : v.prodigi.status.stage === 'Cancelled' || v.prodigi.status.issues.length
                        ? 'bad'
                        : 'warn'
                  }`}
                >
                  {v.prodigi.status.stage.toUpperCase()}
                </span>
              )}
            </div>

            {!v.paid && (
              <div className="panel" style={{ marginBottom: 24 }}>
                <p>
                  Nothing has been sent to the print lab — your shirt is produced only after
                  payment succeeds. If you closed the checkout by accident, simply design your
                  sky again; nothing was charged.
                </p>
              </div>
            )}

            {v.fulfillError && (
              <div className="panel" style={{ marginBottom: 24, borderColor: 'rgba(232,143,143,0.5)' }}>
                <p style={{ color: 'var(--error)' }}>
                  Payment succeeded but the print order hit a problem: {v.fulfillError}. Refresh
                  this page in a minute — fulfilment retries automatically. If it persists,
                  contact support with your order reference.
                </p>
              </div>
            )}

            <div className="order-grid">
              <div>
                {v.design && v.product && (
                  <DesignPreview design={v.design} color={v.product.color} />
                )}
              </div>
              <div>
                <dl className="meta">
                  {v.amount && <><dt>Total paid</dt><dd>{v.amount}</dd></>}
                  {v.email && <><dt>Confirmation sent to</dt><dd>{v.email}</dd></>}
                  {v.shippingName && (
                    <>
                      <dt>Shipping to</dt>
                      <dd>
                        {v.shippingName}
                        {v.shippingAddress && <><br />{v.shippingAddress}</>}
                      </dd>
                    </>
                  )}
                  {v.product && (
                    <>
                      <dt>Garment</dt>
                      <dd>
                        Bella + Canvas 3001 · {v.product.color} · size {v.product.size.toUpperCase()}
                      </dd>
                    </>
                  )}
                  {v.design && (
                    <>
                      <dt>The moment</dt>
                      <dd>
                        {v.design.date}
                        {v.design.time ? ` at ${v.design.time} local` : ' · evening sky (approx.)'}
                        <br />
                        {v.design.place}
                      </dd>
                    </>
                  )}
                  <dt>Order reference</dt>
                  <dd style={{ fontSize: 13, wordBreak: 'break-all' }}>{v.reference}</dd>
                </dl>

                <ul className="timeline">
                  <li className={v.paid ? 'done' : ''}>
                    <span className="dot" /> Payment confirmed
                  </li>
                  {STAGES.map(([key, label]) => {
                    const state = v.prodigi?.status.details?.[key];
                    const done = state === 'Complete' || state === 'InProgress';
                    return (
                      <li key={key} className={done ? 'done' : ''}>
                        <span className="dot" /> {label}
                        {state && <em style={{ marginLeft: 8, fontSize: 12 }}>({state})</em>}
                      </li>
                    );
                  })}
                </ul>

                {v.prodigi?.shipments?.flatMap((s) =>
                  s.tracking?.url || s.tracking?.number
                    ? [
                        <p key={s.id}>
                          Tracking:{' '}
                          {s.tracking.url ? (
                            <a href={s.tracking.url} target="_blank" rel="noreferrer">
                              {s.tracking.number ?? 'follow shipment'}
                            </a>
                          ) : (
                            s.tracking.number
                          )}
                        </p>,
                      ]
                    : []
                )}
                {v.prodigiError && (
                  <p style={{ color: 'var(--ivory-faint)', fontSize: 14 }}>
                    Print status temporarily unavailable ({v.prodigiError}).
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="site-footer">
        <p>STARRYBORN · keep this link — it’s your order tracker</p>
      </footer>
    </main>
  );
}
