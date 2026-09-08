'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { renderChart, SHIRTS, type Spec } from '@/lib/chart';
import { Garment } from './Tee';

type OrderData = {
  paid: boolean;
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  quantity: number;
  spec: Spec;
  prodigiOrderId: string | null;
  prodigiError: string | null;
  production: { stage: string; label: string; tracking?: { number?: string; url?: string; carrier?: string } } | null;
};

export default function OrderView() {
  const params = useSearchParams();
  const sessionId = params.get('session_id') || '';
  const [data, setData] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No order was referenced.');
      return;
    }
    let live = true;
    let tries = 0;
    const tick = async () => {
      try {
        const res = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`);
        const json = await res.json();
        if (!live) return;
        if (!res.ok) throw new Error(json.error || 'That order could not be found.');
        setData(json);
        // Keep looking until the press has taken it. This has to outlast the
        // order route's 90s fulfilment grace period, or a buyer whose webhook
        // never arrived would have to reload by hand to trigger the safety net.
        if (!json.prodigiOrderId && tries < 36) {
          tries += 1;
          setTimeout(tick, tries < 10 ? 3000 : 6000);
        }
      } catch (err: any) {
        if (live) setError(err?.message || 'That order could not be found.');
      }
    };
    tick();
    return () => {
      live = false;
    };
  }, [sessionId]);

  const svg = useMemo(() => (data ? renderChart(data.spec) : ''), [data]);

  if (error) {
    return (
      <>
        <h1 className="sc">A blank page</h1>
        <p>{error}</p>
        <p>
          <a href="/">Return to the chart room</a>
        </p>
      </>
    );
  }

  if (!data) return <p className="note">Fetching the ledger...</p>;

  if (!data.paid) {
    return (
      <>
        <h1 className="sc">Not yet settled</h1>
        <p>
          This order has not been paid, so nothing has been sent to the press. If you closed
          the payment window, you can{' '}
          <a href="/">start again</a>.
        </p>
      </>
    );
  }

  const money =
    data.amountTotal != null
      ? `${(data.amountTotal / 100).toFixed(2)} ${(data.currency || 'usd').toUpperCase()}`
      : '-';

  return (
    <>
      <div className="stamp">Paid &#183; entered in the ledger</div>
      <h1 className="sc" style={{ fontWeight: 400, margin: '0 0 6px' }}>
        The Isle of {data.spec.name || 'You'}
      </h1>
      <p className="note" style={{ marginTop: 0 }}>
        A receipt is on its way to {data.email || 'your inbox'}.
      </p>

      <div className="tee-frame" style={{ maxWidth: 380, margin: '26px auto 0' }}>
        <div className={`tee${SHIRTS[data.spec.shirt].dark ? ' on-dark' : ''}`}>
          <Garment shirt={data.spec.shirt} />
          <div className="art" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </div>

      <table className="ledger">
        <tbody>
          <tr>
            <th>Garment</th>
            <td>
              Gildan 64000, {SHIRTS[data.spec.shirt].label}, size {data.spec.size.toUpperCase()}
              {data.quantity > 1 ? ` × ${data.quantity}` : ''}
            </td>
          </tr>
          <tr>
            <th>Paid</th>
            <td>{money}</td>
          </tr>
          <tr>
            <th>At the press</th>
            <td>
              {data.prodigiOrderId ? (
                <>
                  Order {data.prodigiOrderId}
                  {data.production ? ` · ${data.production.label}` : ''}
                </>
              ) : data.prodigiError ? (
                <>
                  Held for review. Our press reported: {data.prodigiError}. Your payment is
                  safe and we will follow up by email.
                </>
              ) : (
                'Being handed to the press...'
              )}
            </td>
          </tr>
          {data.production?.tracking?.number ? (
            <tr>
              <th>Tracking</th>
              <td>
                {data.production.tracking.url ? (
                  <a href={data.production.tracking.url} target="_blank" rel="noreferrer">
                    {data.production.tracking.carrier || 'Carrier'} {data.production.tracking.number}
                  </a>
                ) : (
                  `${data.production.tracking.carrier || ''} ${data.production.tracking.number}`
                )}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <p className="note">
        Keep this page bookmarked &#8212; it is the live status of your plate.
      </p>
      <p>
        <a href="/">Chart another island</a>
      </p>
    </>
  );
}
