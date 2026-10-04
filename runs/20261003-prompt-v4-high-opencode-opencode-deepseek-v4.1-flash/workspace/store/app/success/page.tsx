import { headers } from 'next/headers';
import { fulfillCheckoutSession, type FulfillResult } from '@/lib/fulfill';
import { originFromHeaders } from '@/lib/origin';

export const dynamic = 'force-dynamic';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  const origin = originFromHeaders(headers());

  let result: FulfillResult | null = null;
  let error = '';

  if (!sessionId) {
    error = 'No checkout session was provided.';
  } else {
    try {
      result = await fulfillCheckoutSession(sessionId, origin);
    } catch (err) {
      error = (err as Error).message || 'We could not confirm your order.';
    }
  }

  const ok = result && (result.state === 'fulfilled' || result.state === 'already');
  const price = result?.priceCents ? `$${(result.priceCents / 100).toFixed(2)}` : '—';

  return (
    <div className="result">
      <div className="result-card">
        {ok ? (
          <>
            <div className="check">✓</div>
            <h1>Your one-of-one is confirmed</h1>
            <p>
              Payment received. Your artwork has been sent to the press and is now being prepared for print.
              {result?.state === 'already' ? ' (This order was already submitted — nothing was duplicated.)' : ''}
            </p>
            {result?.message ? <p className="note">{result.message}</p> : null}
            {result?.designToken && (
              <div className="result-design">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/mockup?t=${encodeURIComponent(result.designToken)}&w=600`}
                  alt="Your generated design on a shirt"
                  width={260}
                  height={303}
                />
              </div>
            )}
            <div className="result-details">
              <div className="row">
                <span>Prodigi order</span>
                <strong className="mono">{result?.orderId || 'pending'}</strong>
              </div>
              <div className="row">
                <span>Status</span>
                <strong>{result?.prodigiStage || 'In progress'}</strong>
              </div>
              <div className="row">
                <span>Garment</span>
                <strong>
                  {result?.shirtName || 'Tee'} · Size {result?.sizeName || '—'}
                </strong>
              </div>
              <div className="row">
                <span>Paid</span>
                <strong>{price}</strong>
              </div>
            </div>
            <p className="note">
              A receipt has been emailed by Stripe. Production and shipping are handled by Prodigi; you will receive
              tracking details once your shirt is dispatched.
            </p>
          </>
        ) : (
          <>
            <div className="check" style={{ background: 'rgba(255,190,90,0.12)', borderColor: 'rgba(255,190,90,0.4)', color: '#ffd79a' }}>
              !
            </div>
            <h1>{result?.state === 'unpaid' ? 'Payment not completed' : 'We could not confirm your order'}</h1>
            <p>
              {error ||
                result?.message ||
                'Your payment has not been marked as paid yet. If you were charged, contact us and we will sort it out.'}
            </p>
          </>
        )}
        <a className="btn-ghost" href="/">
          ← Back to the studio
        </a>
      </div>
    </div>
  );
}
