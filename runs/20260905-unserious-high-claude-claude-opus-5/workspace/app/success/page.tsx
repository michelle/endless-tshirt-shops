import Link from 'next/link';
import { headers } from 'next/headers';
import ShirtPreview from '@/components/ShirtPreview';
import { DEFAULT_COLOUR, findColour, formatPrice, isFit, type Size } from '@/lib/catalog';
import { existingOrderId, fulfil, retrieveSession } from '@/lib/fulfil';
import { artworkUrl, siteOrigin } from '@/lib/site';

export const dynamic = 'force-dynamic';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="wrap masthead">
        <p className="wordmark">
          <Link href="/" style={{ textDecoration: 'none' }}>
            datetime<span className="dot">.</span>store
          </Link>
        </p>
        <p className="masthead-note">receipt</p>
      </header>
      <main className="wrap">
        <div className="receipt">{children}</div>
      </main>
    </>
  );
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <Shell>
        <h1>No receipt here</h1>
        <p>This page needs a checkout session to talk about. Yours seems to have wandered off.</p>
        <Link className="btn-secondary" href="/">
          Back to the store
        </Link>
      </Shell>
    );
  }

  // Reconstruct the origin from the incoming request so the artwork URL we hand
  // Prodigi resolves publicly, even on a preview deployment.
  const hdrs = await headers();
  const origin = siteOrigin(
    new Request('https://placeholder.invalid/success', {
      headers: {
        'x-forwarded-host': hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? '',
        'x-forwarded-proto': hdrs.get('x-forwarded-proto') ?? 'https',
      },
    }),
  );

  let session;
  try {
    session = await retrieveSession(sessionId);
  } catch {
    return (
      <Shell>
        <h1>We cannot find that order</h1>
        <p>Stripe does not recognise this checkout session. If you were charged, email us and we will sort it out.</p>
        <Link className="btn-secondary" href="/">
          Back to the store
        </Link>
      </Shell>
    );
  }

  if (session.payment_status !== 'paid') {
    return (
      <Shell>
        <h1>This one is not paid for</h1>
        <p>The moment has not been purchased, so it remains, technically, everyone&rsquo;s.</p>
        <Link className="btn-secondary" href="/">
          Back to the store
        </Link>
      </Shell>
    );
  }

  // The webhook normally does this. Running it here too means a store with no
  // webhook configured still prints shirts. fulfil() is idempotent.
  let prodigiOrderId = existingOrderId(session);
  let fulfilError: string | null = null;
  if (!prodigiOrderId) {
    const result = await fulfil(session, origin);
    if (result.status === 'created' || result.status === 'already') {
      prodigiOrderId = result.prodigiOrderId;
    } else if (result.status === 'failed') {
      fulfilError = result.error;
    }
  }

  const meta = session.metadata ?? {};
  const timestamp = meta.timestamp ?? '';
  const colour = findColour(meta.colour) ?? DEFAULT_COLOUR;
  const fit = isFit(meta.fit) ? meta.fit : 'classic';
  const size = (meta.size ?? 'M') as Size;
  const humanTime = timestamp
    ? new Date(Number(timestamp)).toUTCString().replace('GMT', 'UTC')
    : 'unknown';

  return (
    <Shell>
      <h1>It is yours. It was always going to be.</h1>
      <p>
        That millisecond is now spoken for. We have sent the print file to the press and a receipt
        to {session.customer_details?.email ?? 'your email address'}.
      </p>

      <div className="receipt-hero">
        <span className="label">The moment you bought</span>
        <div className="stamp">{timestamp || '—'}</div>
        <div className="human">{humanTime}</div>
      </div>

      <div style={{ maxWidth: 260, margin: '0 auto 26px' }}>
        <ShirtPreview fit={fit} colour={colour} frozen={timestamp} />
      </div>

      <div className="rows">
        <div className="row">
          <span className="k">Garment</span>
          <span className="v">
            {colour.label} · {fit} · {size}
          </span>
        </div>
        <div className="row">
          <span className="k">Paid</span>
          <span className="v">{formatPrice(session.amount_total ?? 0)}</span>
        </div>
        <div className="row">
          <span className="k">Stripe</span>
          <span className="v">{session.id}</span>
        </div>
        <div className="row">
          <span className="k">Print order</span>
          <span className="v">{prodigiOrderId ?? (fulfilError ? 'queued for retry' : 'pending')}</span>
        </div>
        {timestamp && (
          <div className="row">
            <span className="k">Print file</span>
            <span className="v">
              <a href={artworkUrl(origin, colour.ink, timestamp)} target="_blank" rel="noreferrer">
                view the PNG
              </a>
            </span>
          </div>
        )}
      </div>

      {fulfilError && (
        <p className="alert" style={{ marginTop: 20 }}>
          Your payment went through, but the printer did not accept the order yet. Stripe will retry
          automatically. Nothing is lost — the moment is recorded above.
        </p>
      )}

      <Link className="btn-secondary" href="/">
        Buy a different moment
      </Link>
    </Shell>
  );
}
