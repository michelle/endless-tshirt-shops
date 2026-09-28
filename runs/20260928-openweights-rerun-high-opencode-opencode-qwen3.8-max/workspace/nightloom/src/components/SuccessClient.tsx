'use client';

// Live fulfilment status: polls the Prodigi order status for this reference.

import { useEffect, useState } from 'react';

interface Shipment {
  status: string | null;
  carrier: string | null;
  trackingUrl: string | null;
  trackingNumber: string | null;
}

interface OrderStatus {
  id: string | null;
  stage: string | null;
  details: Record<string, string> | null;
  shipments: Shipment[];
}

const STAGES: { key: string; label: string }[] = [
  { key: 'downloadAssets', label: 'Artwork received' },
  { key: 'printReadyAssetsPrepared', label: 'Print file prepared' },
  { key: 'allocateProductionLocation', label: 'Print studio assigned' },
  { key: 'inProduction', label: 'Printing your sky' },
  { key: 'shipping', label: 'Shipped' },
];

export default function SuccessClient({ orderRef }: { orderRef: string }) {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch(`/api/order/${encodeURIComponent(orderRef)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        if (data.found && data.orders?.length) setStatus(data.orders[0]);
      } catch {
        /* keep polling */
      }
    }
    poll();
    const iv = setInterval(() => {
      setTries((t) => t + 1);
      poll();
    }, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [orderRef]);

  if (tries > 12 && !status) {
    return (
      <div className="panel p-5 text-[13px] muted">
        Status will appear here once the print studio picks up your order. Reference:{' '}
        <span className="gold">{orderRef}</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="panel p-5 flex items-center gap-4 text-[13px] muted">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
        Sending your sky to the print studio…
      </div>
    );
  }

  const details = status.details ?? {};

  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="text-[11px] tracked muted">production status</div>
        <div className="badge">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" />
          {status.stage ?? 'received'} · {status.id}
        </div>
      </div>
      <ol className="space-y-3">
        {STAGES.map((s) => {
          const state = details[s.key] ?? 'NotStarted';
          const isDone = state === 'Complete';
          const isNow = state === 'InProgress';
          return (
            <li key={s.key} className="flex items-center gap-3 text-[13px]">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isDone
                    ? 'bg-[var(--ok)]'
                    : isNow
                      ? 'bg-[var(--gold)] animate-pulse'
                      : 'bg-[rgba(233,226,208,0.15)]'
                }`}
              />
              <span className={isDone || isNow ? 'text-[var(--ink)]' : 'faint'}>
                {s.label}
                {isNow && <span className="faint"> — in progress</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {status.shipments.length > 0 && (
        <div className="mt-5 border-t hairline pt-4 space-y-2">
          {status.shipments.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-[12.5px] muted">
              <span className="badge">{s.status ?? 'shipment'}</span>
              {s.carrier && <span>via {s.carrier}</span>}
              {s.trackingUrl ? (
                <a className="gold hover:underline" href={s.trackingUrl} target="_blank" rel="noreferrer">
                  track {s.trackingNumber ?? ''} →
                </a>
              ) : (
                s.trackingNumber && <span>tracking {s.trackingNumber}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
