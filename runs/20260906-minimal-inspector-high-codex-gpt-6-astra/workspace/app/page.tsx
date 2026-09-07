'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, ArrowRight, LockKeyhole, Check } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Header, Footer } from '@/components/chrome';
import { configureShirtTool } from '@/lib/webmcp';
export default function Home() {
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [fit, setFit] = useState('unisex');
  const [size, setSize] = useState('M');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'size' | 'privacy' | 'terms' | null>(null);
  const [cancelled, setCancelled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCancelled(new URLSearchParams(location.search).has('cancelled'));
      setTimestamp(Date.now());
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (busy) return;
    const t = setInterval(() => setTimestamp(Date.now()), 43);
    return () => clearInterval(t);
  }, [busy]);
  useEffect(
    () =>
      configureShirtTool((f, s) => {
        setFit(f);
        setSize(s);
      }),
    [],
  );
  async function checkout() {
    if (busy) return;
    setBusy(true);
    setError('');
    const captured = Date.now();
    setTimestamp(captured);
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fit,
          size,
          timestamp: captured,
          requestId: crypto.randomUUID(),
        }),
      });
      const d = await r.json();
      if (!r.ok)
        throw new Error(
          d.error || 'Checkout could not be started. Please try again.',
        );
      window.location.assign(d.url);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Something went wrong. Please try again.',
      );
      setBusy(false);
    }
  }
  const time = timestamp?.toString() || '0000000000000';
  return (
    <>
      <Header />
      <div className="test-banner">
        Test store · No real payments or physical shipments
      </div>
      <main>
        <section className="hero" aria-label="The datetime tee">
          <div>
            <div className="product-stage">
              <div className="stage-label mono">
                FIG. 001 — THE DATETIME TEE
              </div>
              <Image
                className="shirt-image"
                sizes="(max-width: 650px) 100vw, 600px"
                src="/shirt.webp"
                width="1254"
                height="1254"
                alt="Black crewneck t-shirt with a small white Unix timestamp across the chest"
                fetchPriority="high"
              />
              <span className="shirt-print" aria-hidden="true">
                {time}
              </span>
              <div className="stage-bottom mono">
                <span>
                  <span className="dot" />
                  {busy ? 'MOMENT CAPTURED' : 'LIVE PREVIEW'}
                </span>
                <span>BLACK / {fit.toUpperCase()}</span>
              </div>
            </div>
            <div className="caption mono">
              <span>One moment. Yours to keep.</span>
              <span>Illustrative preview</span>
            </div>
          </div>
          <div className="product-info">
            <div className="eyebrow mono">
              <span className="dot" /> Made in the moment
            </div>
            <h1>
              Time flies.
              <br />
              <em>Wear a little of it.</em>
            </h1>
            <p className="intro">
              We sell a t-shirt with the current datetime.
              <br />A small reminder that right now only happens once.
            </p>
            <div className="price-row">
              <span className="price">$22.50</span>
              <del className="old-price">$30.00</del>
              <span className="shipping-label">Free US shipping</span>
            </div>
            <hr className="rule" />
            <div className="field-head">
              <span>
                01 <span className="sub">/</span> Choose your fit
              </span>
            </div>
            <RadioGroup
              aria-label="Fit"
              className="choices"
              value={fit}
              onValueChange={(v) => setFit(String(v))}
              disabled={busy}
            >
              {['unisex', 'fitted'].map((f) => (
                <label className="choice" key={f}>
                  <RadioGroupItem value={f} />
                  {f === 'unisex' ? 'Unisex' : 'Fitted'}
                  <Check className="check" size={14} />
                </label>
              ))}
            </RadioGroup>
            <div className="field-head">
              <span>
                02 <span className="sub">/</span> Choose your size
              </span>
              <button className="text-button" onClick={() => setModal('size')}>
                Size guide{' '}
                <ArrowUpRight size={11} style={{ display: 'inline' }} />
              </button>
            </div>
            <RadioGroup
              aria-label="Size"
              className="choices"
              value={size}
              onValueChange={(v) => setSize(String(v))}
              disabled={busy}
            >
              {['S', 'M', 'L', 'XL'].map((s) => (
                <label className="choice" key={s}>
                  <RadioGroupItem value={s} />
                  {s}
                </label>
              ))}
            </RadioGroup>
            <div className="color-line">
              <span className="swatch" />
              Black tee <span aria-hidden="true">·</span> White print
            </div>
            {cancelled && (
              <p className="error" aria-live="polite">
                Checkout cancelled. Your card wasn’t charged. A new moment is
                ready when you are.
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="buy-button" disabled={busy} onClick={checkout}>
              <span>
                {busy ? 'Capturing your moment…' : 'Make this moment yours'}
              </span>
              <ArrowRight size={19} />
            </button>
            <p className="checkout-note">
              <LockKeyhole size={11} /> Secure checkout with Stripe
            </p>
            <p className="moment-note">
              Your timestamp freezes when you click.
              <br />
              Then we print that exact moment, just for you.
            </p>
          </div>
        </section>
        <section className="details" id="the-details">
          <div className="story">
            <p className="mini-title mono">A very specific point in time</p>
            <h2>Thirteen digits. One of a kind.</h2>
            <p>
              No dates to pick. No message to write. Just the number of
              milliseconds since January 1, 1970 — captured as you check out and
              printed in white on black.
            </p>
          </div>
          <div className="faq">
            <details>
              <summary>What am I actually wearing?</summary>
              <p>
                A Unix timestamp in milliseconds. For example, 1767225600000
                means January 1, 2026 at 00:00:00 UTC. Yours records the instant
                you click the checkout button. The same 13 digits appear on your
                confirmation and your tee.
              </p>
            </details>
            <details>
              <summary>The tee & the fit</summary>
              <p>
                Unisex: Bella+Canvas 3001, a soft cotton crewneck with a
                tailored everyday fit. Fitted: Bella+Canvas 6004, a
                closer-fitting women’s crewneck. Both are black with white
                direct-to-garment printing. The product image is an
                illustration; the exact cut and print placement can vary.
              </p>
            </details>
            <details>
              <summary>Printing, shipping & care</summary>
              <p>
                Each tee is made to order by Prodigi. We currently offer free
                standard shipping to US addresses. Allow approximately 3–5
                business days for production, plus delivery time. Wash inside
                out on a cool cycle; do not iron directly on the print. This
                test store doesn’t produce or ship physical items.
              </p>
            </details>
          </div>
        </section>
        <div className="ticker mono" aria-hidden="true">
          a moment in time &nbsp; / &nbsp; <b>{time}</b> &nbsp; / &nbsp; a
          moment in time
        </div>
      </main>
      <Footer
        onPrivacy={() => setModal('privacy')}
        onTerms={() => setModal('terms')}
      />
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="modal">
          <DialogTitle>
            {modal === 'size'
              ? 'Find your fit.'
              : modal === 'privacy'
                ? 'Your data, briefly.'
                : 'A note before you order.'}
          </DialogTitle>
          <DialogDescription>
            {modal === 'size'
              ? 'Compare with a tee you already love. Measurements are in inches.'
              : modal === 'privacy'
                ? 'Only the details needed to process your order.'
                : 'This is a fully connected test storefront.'}
          </DialogDescription>
          {modal === 'size' ? (
            <>
              <p>
                <strong>Unisex · Bella+Canvas 3001</strong>
                <br />
                Chest circumference / body length from high shoulder.
              </p>
              <table className="size-table">
                <thead>
                  <tr>
                    <th scope="col">Size</th>
                    <th scope="col">Chest</th>
                    <th scope="col">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['S', '34', '28'],
                    ['M', '38', '29'],
                    ['L', '43', '30'],
                    ['XL', '46', '31'],
                  ].map((r) => (
                    <tr key={r[0]}>
                      {r.map((v, i) =>
                        i === 0 ? (
                          <th key={i} scope="row">
                            {v}
                          </th>
                        ) : (
                          <td key={i}>{v}″</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                <strong>Fitted · Bella+Canvas 6004</strong>
                <br />
                This cut runs closer to the body. Check the{' '}
                <a
                  className="underline"
                  href="https://www.prodigi.com/products/womens-clothing/t-shirts/classic/bella-canvas-6004/"
                  target="_blank"
                  rel="noreferrer"
                >
                  manufacturer’s measurements ↗
                </a>{' '}
                before choosing a size.
              </p>
            </>
          ) : modal === 'privacy' ? (
            <p>
              Your email and shipping address are collected by Stripe at
              checkout and shared with Prodigi to fulfill your order. Card
              details stay with Stripe. We use no advertising cookies. Avoid
              entering sensitive personal data while testing. Live-store contact
              and retention policies must be finalized before real orders are
              enabled.
            </p>
          ) : (
            <p>
              All prices are USD. Each purchase is one personalized tee with
              free US standard shipping. This deployment uses Stripe test
              payments and Prodigi sandbox fulfillment; you will not be charged
              or receive an item. Before accepting real orders, the store owner
              must publish a support contact, return policy, and final delivery
              and tax terms.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
