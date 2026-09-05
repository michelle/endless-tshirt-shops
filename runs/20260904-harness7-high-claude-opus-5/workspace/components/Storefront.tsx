'use client';

import { useCallback, useState } from 'react';
import { Shirt } from './Shirt';
import {
  LIST_PRICE_CENTS,
  PRICE_CENTS,
  PRODUCTS,
  SIZES,
  STYLES,
  formatPrice,
  type Size,
  type Style,
} from '@/lib/catalog';

export function Storefront({ canceled }: { canceled: boolean }) {
  const [style, setStyle] = useState<Style>('fitted');
  const [size, setSize] = useState<Size>('M');
  const [busy, setBusy] = useState(false);
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buy = useCallback(async () => {
    setError(null);
    setBusy(true);

    // This is the product. Whatever millisecond it is when you commit is the
    // millisecond that gets printed, so it is captured before anything async
    // happens and then held on screen while Stripe loads.
    const timestamp = Date.now();
    setFrozenAt(timestamp);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, style, size }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !payload.url) {
        throw new Error(payload.error ?? 'Checkout is unavailable right now.');
      }
      window.location.assign(payload.url);
    } catch (err) {
      setBusy(false);
      setFrozenAt(null); // let the clock run again
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }, [style, size]);

  return (
    <div className="shop">
      <div>
        {/* The badge is positioned against this stage, not the page, so it
            stays pinned to the garment at every viewport width. */}
        <div className="shirt-stage">
          <Shirt style={style} frozenAt={frozenAt} />
          <div className="shirt-price">
            <s>{formatPrice(LIST_PRICE_CENTS)}</s>
            <span>{formatPrice(PRICE_CENTS)}</span>
          </div>
        </div>
        <p className="shirt-caption">
          {frozenAt
            ? 'Your moment, held. Finish checkout to print it.'
            : 'Live. The moment you buy is the moment we print.'}
        </p>
      </div>

      <div className="choices">
        {canceled && (
          <p className="notice">
            Checkout canceled — that moment is gone, but there is another one right now.
          </p>
        )}

        <fieldset className="fieldset">
          <legend>Cut</legend>
          <div className="options two">
            {STYLES.map((s) => (
              <div key={s} style={{ position: 'relative' }}>
                <input
                  type="radio"
                  id={`style-${s}`}
                  name="style"
                  value={s}
                  checked={style === s}
                  disabled={busy}
                  onChange={() => setStyle(s)}
                />
                <label htmlFor={`style-${s}`}>{PRODUCTS[s].label}</label>
              </div>
            ))}
          </div>
          <p className="blurb">{PRODUCTS[style].blurb}</p>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Size</legend>
          <div className="options four">
            {SIZES.map((s) => (
              <div key={s} style={{ position: 'relative' }}>
                <input
                  type="radio"
                  id={`size-${s}`}
                  name="size"
                  value={s}
                  checked={size === s}
                  disabled={busy}
                  onChange={() => setSize(s)}
                />
                <label htmlFor={`size-${s}`}>{s}</label>
              </div>
            ))}
          </div>
        </fieldset>

        <button className="buy" onClick={buy} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Holding {frozenAt}…
            </>
          ) : (
            `Buy now — ${formatPrice(PRICE_CENTS)}`
          )}
        </button>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <p className="finePrint">
          Free worldwide shipping. Printed to order on a black ringspun cotton tee and
          dispatched from the print partner nearest you, usually within 5–12 business days.
          Every shirt is unique by construction, so we can only accept returns for
          misprints or damage.
        </p>
      </div>
    </div>
  );
}
