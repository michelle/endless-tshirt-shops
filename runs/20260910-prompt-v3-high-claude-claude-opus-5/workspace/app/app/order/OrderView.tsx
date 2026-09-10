'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { decodeDesign, formatMoney } from '@/lib/design';
import { buildSpecimen } from '@/lib/species';
import { shirtSvg } from '@/lib/draw/shirt';
import { COLOR_BY_ID } from '@/lib/catalog';

type OrderData = {
  id: string;
  paid: boolean;
  amountTotal: number;
  currency: string;
  email: string | null;
  design: string | null;
  prodigiOrderId: string | null;
  fulfilmentError: string | null;
  production: { stage: string | null; tracking: string | null; carrier: string | null } | null;
  error?: string;
};

const STAGE_COPY: Record<string, string> = {
  InProgress: 'At the press',
  Complete: 'Dispatched',
  Cancelled: 'Cancelled',
};

export default function OrderView({ sessionId }: { sessionId: string | null }) {
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      try {
        const res = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`);
        const json = (await res.json()) as OrderData;
        if (cancelled) return;
        setData(json);
        setLoading(false);
        // Keep checking briefly while the webhook catches up.
        if (!json.error && json.paid && !json.prodigiOrderId && tries < 6) {
          tries += 1;
          setTimeout(poll, 2500);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="wrap order-page">
        <div className="order-card">
          <h1>No order to show</h1>
          <p className="summary-muted">This page needs a checkout reference.</p>
          <div className="btn-row">
            <Link className="btn" href="/design">
              Collect a specimen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wrap order-page">
        <div className="order-card">
          <p className="order-status">
            <span className="spin" /> Confirming your order
          </p>
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="wrap order-page">
        <div className="order-card">
          <h1>We couldn&apos;t find that order</h1>
          <p className="summary-muted">
            If you were charged, email us the reference <code>{sessionId.slice(-12)}</code> and
            we&apos;ll sort it out.
          </p>
        </div>
      </div>
    );
  }

  const design = data.design ? decodeDesign(data.design) : null;
  let specimen = null;
  let shirt = '';
  if (design) {
    specimen = buildSpecimen({ name: design.n, date: design.d, place: design.p, paletteId: design.pal });
    const colour = COLOR_BY_ID[design.col];
    shirt = shirtSvg(specimen, colour.hex, colour.dark);
  }

  const stage = data.production?.stage;

  return (
    <div className="wrap order-page">
      <div className="order-card">
        {data.paid ? (
          <>
            <p className="order-status">✓ Payment received</p>
            <h1 style={{ marginTop: 14, fontSize: '2.1rem' }}>
              {specimen ? (
                <>
                  <em style={{ fontStyle: 'italic' }}>
                    {specimen.taxon.genus} {specimen.taxon.epithet}
                  </em>{' '}
                  is on its way to the press.
                </>
              ) : (
                'Your order is confirmed.'
              )}
            </h1>
          </>
        ) : (
          <>
            <p className="order-status" style={{ color: 'var(--accent)' }}>
              Payment not completed
            </p>
            <h1 style={{ marginTop: 14 }}>Nothing has been charged.</h1>
            <p className="summary-muted">
              Your specimen is untouched — go back to the studio and try again whenever you like.
            </p>
          </>
        )}

        {shirt && (
          <div style={{ maxWidth: 320, margin: '26px 0' }} dangerouslySetInnerHTML={{ __html: shirt }} />
        )}

        <dl className="order-dl">
          <dt>Order</dt>
          <dd>
            <code>{data.id.slice(-16)}</code>
          </dd>

          {specimen && (
            <>
              <dt>Specimen</dt>
              <dd>
                {specimen.taxon.accession} — “{specimen.taxon.common}”
              </dd>
              <dt>Label</dt>
              <dd>
                Collected by {specimen.taxon.collector} at {specimen.taxon.locality},{' '}
                {specimen.taxon.dateLong}
              </dd>
            </>
          )}

          {design && (
            <>
              <dt>Garment</dt>
              <dd>
                {COLOR_BY_ID[design.col].name}, size {design.sz.toUpperCase()} × {design.q}
              </dd>
            </>
          )}

          <dt>Paid</dt>
          <dd>{formatMoney(data.amountTotal, data.currency)}</dd>

          {data.email && (
            <>
              <dt>Receipt</dt>
              <dd>{data.email}</dd>
            </>
          )}

          {data.paid && (
            <>
              <dt>Production</dt>
              <dd>
                {data.prodigiOrderId ? (
                  <>
                    {stage ? STAGE_COPY[stage] ?? stage : 'Accepted by the press'} ·{' '}
                    <code>{data.prodigiOrderId}</code>
                  </>
                ) : data.fulfilmentError ? (
                  <span style={{ color: 'var(--accent)' }}>
                    Held for review — we&apos;ll email you. ({data.fulfilmentError.slice(0, 120)})
                  </span>
                ) : (
                  <>
                    <span className="spin" /> Handing your plate to the press…
                  </>
                )}
              </dd>
            </>
          )}

          {data.production?.tracking && (
            <>
              <dt>Tracking</dt>
              <dd>
                <a href={data.production.tracking} target="_blank" rel="noreferrer">
                  {data.production.carrier ?? 'Track parcel'} ↗
                </a>
              </dd>
            </>
          )}
        </dl>

        {data.design && (
          <div className="btn-row">
            <a
              className="btn btn-ghost"
              href={`/api/artwork?d=${encodeURIComponent(data.design)}&w=1600&garment=1`}
              target="_blank"
              rel="noreferrer"
            >
              Download your plate
            </a>
            <Link className="btn btn-ghost" href={`/design?d=${encodeURIComponent(data.design)}`}>
              Collect another
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
