'use client';

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Shirt from '@/components/Shirt';
import OrderReceipt from '@/components/OrderReceipt';
import { SIZES, STYLES, STYLE_SPECS, formatUsd, PRICE_CENTS, type Size, type Style } from '@/lib/catalog';

type Phase = 'browse' | 'starting' | 'paying' | 'done';

export default function Store({ publishableKey }: { publishableKey: string | null }) {
  const [style, setStyle] = useState<Style>('fitted');
  const [size, setSize] = useState<Size>('M');
  const [phase, setPhase] = useState<Phase>('browse');
  const [frozenTs, setFrozenTs] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // On a phone the shirt fills the screen and the panel sits below it, so a
  // freshly-mounted checkout (or receipt) would otherwise appear off-screen.
  useEffect(() => {
    if (phase === 'paying' || phase === 'done') {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [phase]);

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  const buy = useCallback(async () => {
    // Freeze first, and freeze before anything async: the shirt says the moment
    // the customer decided, not the moment our API happened to respond.
    const ts = Date.now();
    setFrozenTs(ts);
    setPhase('starting');
    setError(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ts, style, size }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Could not start checkout.');
      setClientSecret(payload.clientSecret);
      setSessionId(payload.sessionId);
      setPhase('paying');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setFrozenTs(null);
      setPhase('browse');
    }
  }, [style, size]);

  const cancel = useCallback(() => {
    setPhase('browse');
    setClientSecret(null);
    setSessionId(null);
    setFrozenTs(null);
    setError(null);
  }, []);

  const complete = useCallback(() => setPhase('done'), []);

  return (
    <div className="store">
      <div>
        <Shirt style={style} frozenTs={frozenTs} />
      </div>

      <div ref={panelRef}>
        {phase === 'done' && sessionId ? (
          <OrderReceipt
            sessionId={sessionId}
            showPermalink
            footer={
              <button type="button" className="btn btn-ghost" onClick={cancel}>
                Get another shirt
              </button>
            }
          />
        ) : phase === 'paying' && clientSecret && stripePromise ? (
          <div>
            <div className="checkout-head">
              <h2>Checkout</h2>
              <button type="button" className="linkish" onClick={cancel}>
                Cancel
              </button>
            </div>
            <div className="frozen-note">
              You&rsquo;re buying <strong>{frozenTs}</strong> — {STYLE_SPECS[style].label.toLowerCase()},
              size {size}, black. The clock stopped when you clicked buy.
            </div>
            <div className="stripe-mount">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret, onComplete: complete }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        ) : (
          <>
            {error && <div className="notice notice-error">{error}</div>}
            {!publishableKey && (
              <div className="notice notice-error">
                Stripe isn&rsquo;t configured — set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
              </div>
            )}

            <div className="panel">
              <h2>Cut</h2>
              <div className="options cols-2">
                {STYLES.map((s) => (
                  <div className="option" key={s}>
                    <input
                      id={`style-${s}`}
                      type="radio"
                      name="style"
                      value={s}
                      checked={style === s}
                      onChange={() => setStyle(s)}
                    />
                    <label htmlFor={`style-${s}`}>{STYLE_SPECS[s].label}</label>
                  </div>
                ))}
              </div>
              <p className="option-note">{STYLE_SPECS[style].blurb}</p>
            </div>

            <div className="panel">
              <h2>Size</h2>
              <div className="options cols-4">
                {SIZES.map((s) => (
                  <div className="option" key={s}>
                    <input
                      id={`size-${s}`}
                      type="radio"
                      name="size"
                      value={s}
                      checked={size === s}
                      onChange={() => setSize(s)}
                    />
                    <label htmlFor={`size-${s}`}>{s}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="buy">
              <button
                type="button"
                className="btn"
                onClick={buy}
                disabled={phase === 'starting' || !publishableKey}
              >
                {phase === 'starting' ? (
                  <>
                    <span className="spinner" aria-hidden />
                    Stopping the clock…
                  </>
                ) : (
                  <>Buy this millisecond — {formatUsd(PRICE_CENTS)}</>
                )}
              </button>
              <p className="buy-legal">Free shipping in the US · printed on demand · no returns on a moment</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
