import Link from 'next/link';
import { decodeDesign } from '@/lib/design';
import { inkById, shirtById } from '@/lib/shirts';
import { designAssetUrl, prodigiGetOrder } from '@/lib/server';
import { fulfillStripeSession, getSession } from '@/lib/fulfill';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Your order — Sidereal',
};

interface ProdigiStatus {
  stage?: string;
  details?: Record<string, string>;
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let session: Awaited<ReturnType<typeof getSession>> | null = null;
  try {
    session = await getSession(id);
  } catch {
    session = null;
  }

  if (!session || !session.id) {
    return (
      <div className="narrow">
        <h1 className="display">ORDER NOT FOUND</h1>
        <div className="notice-box">
          We couldn&apos;t find this order. If you just paid, wait a few seconds and{' '}
          <Link href={`/order/${id}`} style={{ textDecoration: 'underline' }}>
            refresh
          </Link>
          .
        </div>
      </div>
    );
  }

  const md = session.metadata || {};
  const design = md.d ? decodeDesign(md.d) : null;
  const shirt = md.color ? shirtById(md.color) : undefined;
  const ink = md.ink ? inkById(md.ink) : undefined;

  const paid = session.payment_status === 'paid';

  // Fulfillment happens only after payment. The Stripe webhook is the primary
  // trigger; this page is the fallback so a missed webhook never strands a
  // paid order. fulfillStripeSession is idempotent.
  let fulfill = null;
  let prodigi: Record<string, unknown> | null = null;
  if (paid) {
    fulfill = await fulfillStripeSession(id);
    const oid = fulfill.prodigiOrderId || md.oid;
    if (oid) prodigi = await prodigiGetOrder(oid);
  }

  const status = (prodigi as { status?: ProdigiStatus } | null)?.status;
  const stage = status?.stage;
  const details = status?.details || {};

  return (
    <div className="narrow">
      <h1 className="display">YOUR ORDER</h1>
      <div className="two-col">
        <div className="summary-card">
          {design && ink && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="art"
              style={{ background: shirt?.hex || '#17171b' }}
              src={`${designAssetUrl(design, ink.id)}&w=560`}
              alt="Your star map design"
            />
          )}
          <div className="body">
            {design && (
              <>
                <div>
                  <b>{design.title.toUpperCase()}</b>
                </div>
                <div>{design.subtitle.toUpperCase()}</div>
              </>
            )}
            {shirt && ink && md.size && (
              <div style={{ marginTop: 8 }}>
                {md.size.toUpperCase()} · {shirt.name} · {ink.name} ink · qty {md.qty || 1}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="panel">
            {!paid && (
              <>
                <span className="status-pill warn">Awaiting payment</span>
                <p className="muted" style={{ marginTop: 14 }}>
                  This checkout hasn&apos;t been paid yet, so nothing has been sent to print. If you
                  completed payment, refresh in a few seconds.
                </p>
              </>
            )}
            {paid && fulfill?.state === 'fulfilled' && (
              <>
                <span className="status-pill ok">Paid · sent to print</span>
                <p className="muted" style={{ marginTop: 14 }}>
                  Thank you! Your payment succeeded and your shirt is with the print lab. Nothing is
                  ever printed before payment clears.
                </p>
              </>
            )}
            {paid && fulfill && fulfill.state !== 'fulfilled' && (
              <>
                <span className="status-pill warn">Paid · sending to print</span>
                <p className="muted" style={{ marginTop: 14 }}>
                  Payment confirmed. We&apos;re handing your design to the print lab now — refresh in
                  a few seconds.
                </p>
                {fulfill.error && <p className="small" style={{ color: 'var(--error)' }}>{fulfill.error}</p>}
              </>
            )}

            <dl className="kv" style={{ marginTop: 18 }}>
              <dt>Order</dt>
              <dd>{session.id}</dd>
              {md.r_email && (
                <>
                  <dt>Email</dt>
                  <dd>{md.r_email}</dd>
                </>
              )}
              {(fulfill?.prodigiOrderId || md.oid) && (
                <>
                  <dt>Print order</dt>
                  <dd>{fulfill?.prodigiOrderId || md.oid}</dd>
                </>
              )}
              {stage && (
                <>
                  <dt>Print status</dt>
                  <dd>{stage}</dd>
                </>
              )}
              {Object.keys(details).length > 0 && (
                <>
                  <dt>Production</dt>
                  <dd>
                    {Object.entries(details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')}
                  </dd>
                </>
              )}
            </dl>
          </div>

          <div className="panel">
            <h2 className="display" style={{ fontSize: '1rem', letterSpacing: '0.16em', marginTop: 0 }}>
              WHAT HAPPENS NEXT
            </h2>
            <ol className="muted" style={{ paddingLeft: 20, marginBottom: 0 }}>
              <li>Your print file is generated and sent to the nearest lab.</li>
              <li>Your shirt is printed, cured and quality-checked (2–4 days).</li>
              <li>It ships to you with standard tracked-as-available service.</li>
            </ol>
          </div>

          <Link href="/design" className="btn btn-ghost">
            ← Design another sky
          </Link>
        </div>
      </div>
    </div>
  );
}
