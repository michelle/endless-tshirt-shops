'use client';

import { useEffect, useState } from 'react';
import ShirtPreview from './ShirtPreview';
import {
  COLOURS,
  COMPARE_AT_CENTS,
  DEFAULT_COLOUR,
  FITS,
  PRICE_CENTS,
  SIZES,
  formatPrice,
  type Fit,
  type Size,
} from '@/lib/catalog';

/** Human-readable rendering of the live clock, for the caption under the shirt. */
function useLiveCaption(): string {
  const [caption, setCaption] = useState('');
  useEffect(() => {
    const update = () =>
      setCaption(
        new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'medium',
        }).format(new Date()),
      );
    update();
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, []);
  return caption;
}

export default function StoreClient({ cancelled }: { cancelled: boolean }) {
  const [fit, setFit] = useState<Fit>('classic');
  const [size, setSize] = useState<Size>('M');
  const [colour, setColour] = useState(DEFAULT_COLOUR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const caption = useLiveCaption();

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size, fit, colour: colour.id }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout is unavailable.');
      // Leave the page: the timestamp is now fixed server-side, so the ticking stops mattering.
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const fitBlurb = FITS.find((f) => f.id === fit)?.blurb ?? '';

  return (
    <div className="product">
      <div className="stage">
        <ShirtPreview fit={fit} colour={colour} />
        <div className="stage-caption">
          <div>
            <div className="label">Currently printing</div>
            <div className="value">{caption || ' '}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="label">Ink</div>
            <div className="value">{colour.ink === 'white' ? 'White on ' : 'Black on '}{colour.label.toLowerCase()}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="price-row">
          <span className="price">{formatPrice(PRICE_CENTS)}</span>
          <span className="price-was">{formatPrice(COMPARE_AT_CENTS)}</span>
          <span className="price-tag">Always on sale</span>
        </div>
        <p className="price-sub">
          Free shipping. One shirt, one moment. The design is finalised the instant you click
          buy &mdash; not now, not when the parcel arrives.
        </p>

        {cancelled && (
          <p className="alert info">
            You backed out. The moment you were going to buy has passed and is gone forever. There
            are, however, more moments.
          </p>
        )}
        {error && <p className="alert">{error}</p>}

        <div className="field">
          <div className="field-head">
            <span className="field-label">Fit</span>
            <span className="field-value">{fitBlurb}</span>
          </div>
          <div className="chips">
            {FITS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="chip"
                aria-pressed={fit === f.id}
                disabled={busy}
                onClick={() => setFit(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-head">
            <span className="field-label">Colour</span>
            <span className="field-value">{colour.label}</span>
          </div>
          <div className="swatches">
            {COLOURS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="swatch"
                style={{ background: c.hex }}
                aria-pressed={colour.id === c.id}
                aria-label={c.label}
                title={c.label}
                disabled={busy}
                onClick={() => setColour(c)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-head">
            <span className="field-label">Size</span>
            <span className="field-value">Gildan 64000, unisex</span>
          </div>
          <div className="chips">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                aria-pressed={size === s}
                disabled={busy}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="buy" onClick={buy} disabled={busy}>
          {busy ? 'Stopping the clock…' : 'Buy this exact moment'}
        </button>
        <p className="buy-note">
          Secure checkout by Stripe. Printed and shipped by Prodigi.
        </p>
      </div>
    </div>
  );
}
