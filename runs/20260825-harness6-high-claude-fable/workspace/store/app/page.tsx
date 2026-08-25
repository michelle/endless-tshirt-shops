'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadStripe, StripeEmbeddedCheckout } from '@stripe/stripe-js';
import Shirt from '@/components/Shirt';
import { SIZES, STYLES, ShirtSize, ShirtStyle } from '@/lib/products';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const STYLE_LABELS: Record<ShirtStyle, string> = {
  fitted: 'Fitted',
  unisex: 'Unisex',
};

export default function Home() {
  const [style, setStyle] = useState<ShirtStyle>('fitted');
  const [size, setSize] = useState<ShirtSize>('M');
  const [frozenTimestamp, setFrozenTimestamp] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutRef = useRef<StripeEmbeddedCheckout | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  const teardownCheckout = useCallback(() => {
    checkoutRef.current?.destroy();
    checkoutRef.current = null;
  }, []);

  useEffect(() => teardownCheckout, [teardownCheckout]);

  const handleBuy = async () => {
    // This click is the product: the exact millisecond you decided to buy.
    const timestamp = Date.now().toString();
    setError(null);
    setBuying(true);
    setFrozenTimestamp(timestamp);

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const checkout = await stripe.createEmbeddedCheckoutPage({
        fetchClientSecret: async () => {
          const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ style, size, timestamp }),
          });
          const payload = await res.json();
          if (!res.ok || !payload.clientSecret) {
            throw new Error(payload.error || 'Could not start checkout');
          }
          return payload.clientSecret;
        },
      });

      checkoutRef.current = checkout;
      if (mountRef.current) {
        checkout.mount(mountRef.current);
      }
    } catch (err) {
      teardownCheckout();
      setFrozenTimestamp(null);
      setError((err as Error).message);
    } finally {
      setBuying(false);
    }
  };

  const handleCancel = () => {
    teardownCheckout();
    setFrozenTimestamp(null);
    setError(null);
  };

  const checkingOut = frozenTimestamp !== null;

  return (
    <div className="container">
      <header className="page-header">
        <h1>datetime.store</h1>
        <div className="tagline">
          we sell a t-shirt with the current datetime.{' '}
          <span aria-hidden="true">⏱</span>
        </div>
      </header>

      <main className="shop">
        <div className="shop-shirt">
          <Shirt style={style} frozenTimestamp={frozenTimestamp} />
        </div>

        <div className="shop-buy">
          {!checkingOut ? (
            <>
              <div className="options-title">Style</div>
              <div className="radio-group" role="radiogroup" aria-label="Style">
                {STYLES.map((s) => (
                  <span key={s} style={{ display: 'contents' }}>
                    <input
                      id={`style-${s}`}
                      type="radio"
                      name="style"
                      value={s}
                      checked={style === s}
                      onChange={() => setStyle(s)}
                    />
                    <label htmlFor={`style-${s}`}>{STYLE_LABELS[s]}</label>
                  </span>
                ))}
              </div>

              <div className="options-title">Size</div>
              <div className="radio-group" role="radiogroup" aria-label="Size">
                {SIZES.map((s) => (
                  <span key={s} style={{ display: 'contents' }}>
                    <input
                      id={`size-${s}`}
                      type="radio"
                      name="size"
                      value={s}
                      checked={size === s}
                      onChange={() => setSize(s)}
                    />
                    <label htmlFor={`size-${s}`}>{s}</label>
                  </span>
                ))}
              </div>

              <button
                className="buy-button"
                onClick={handleBuy}
                disabled={buying}
              >
                {buying ? 'Freezing time…' : 'Buy now — freeze this moment'}
              </button>
              <p className="buy-hint">
                The millisecond you click is the millisecond on your shirt.
                Forever. 📦 Free shipping!
              </p>
              {error && <div className="buy-error">{error}</div>}
            </>
          ) : (
            <div className="checkout-panel">
              <button className="checkout-cancel" onClick={handleCancel}>
                ← never mind, unfreeze time
              </button>
              <p className="checkout-frozen-note">
                You’re buying <strong>{frozenTimestamp}</strong> — the exact
                millisecond you clicked buy ({STYLE_LABELS[style]}, size {size}
                ). It will never exist again.
              </p>
            </div>
          )}

          {/* Keep the mount node always in the DOM so Stripe can attach to it. */}
          <div
            ref={mountRef}
            className="checkout-mount"
            style={{ display: checkingOut ? 'block' : 'none' }}
          />
        </div>
      </main>

      <footer className="footer">
        Every shirt is one of a kind: black tee, white ink, printed on demand
        with the exact Unix time (in milliseconds) of your purchase. A rebuild
        of the classic{' '}
        <a
          href="https://github.com/michelle/datetime.store"
          target="_blank"
          rel="noreferrer"
        >
          datetime.store
        </a>
        , now fulfilled by Prodigi.
      </footer>
    </div>
  );
}
