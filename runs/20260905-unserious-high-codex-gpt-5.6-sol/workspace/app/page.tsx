'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema: object;
          annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
          execute: (input: unknown) => unknown | Promise<unknown>;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

type Fit = 'unisex' | 'fitted';
type Size = 'S' | 'M' | 'L' | 'XL';

const fits: Array<{ value: Fit; label: string; note: string }> = [
  { value: 'unisex', label: 'Unisex', note: 'relaxed-ish' },
  { value: 'fitted', label: 'Fitted', note: 'less relaxed-ish' },
];
const sizes: Size[] = ['S', 'M', 'L', 'XL'];

async function createCheckout(fit: Fit, size: Size, timestamp: number) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fit, size, timestamp }),
  });
  const data = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !data.url) throw new Error(data.error || 'Checkout wandered off.');
  return data.url;
}

function Shirt({ fit, time }: { fit: Fit; time: number }) {
  const path =
    fit === 'fitted'
      ? 'M79.312 15.149C77.683 13.518 63.195 9.003 63.195 9.003S58.885 17.724 51.535 17.724 39.875 9.003 39.875 9.003 24.521 13.939 23.389 15.071C22.259 16.201 9.677 32.063 9.677 32.063L19.758 40.433 26.372 34.915S40.783 58.886 27.756 93.79C27.756 93.79 71.302 104.557 75.19 93.79 65.501 50.53 76.569 35.177 76.569 35.177L82.836 40.405 92.186 29.288S80.945 16.781 79.312 15.149Z'
      : 'M79.313 6.142C77.683 4.511 63.196 4 63.196 4S53.352 17.724 51.535 17.724C49.719 17.724 39.875 4 39.875 4S24.521 4.932 23.389 6.064C22.259 7.194.562 30.954.562 30.954L16.71 42.975 26.372 34.915 27.756 93.79S71.297 104.495 75.189 93.79L76.568 35.177 85.915 42.974 100 30.953S80.945 7.774 79.313 6.142Z';

  return (
    <div className="shirt-stage" aria-label={`Black ${fit} t-shirt preview showing ${time}`}>
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <svg className="shirt" viewBox="0 0 100 110" role="img" aria-hidden="true">
        <path d={path} />
      </svg>
      <span className="shirt-time">{time}</span>
      <span className="shirt-caption">EXACTLY ONE (1) MOMENT</span>
      <div className="price-sticker">
        <small><s>$30</s> because why?</small>
        <strong>$22.50</strong>
        <span>shipping: suspiciously free</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [time, setTime] = useState(0);
  const [fit, setFit] = useState<Fit>('unisex');
  const [size, setSize] = useState<Size>('M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTime(Date.now());
    const timer = window.setInterval(() => setTime(Date.now()), 47);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(
      context.registerTool(
        {
          name: 'start_datetime_shirt_checkout',
          title: 'Start datetime shirt checkout',
          description: 'Select a black datetime t-shirt fit and size, freeze the current millisecond, and open its secure Stripe checkout.',
          inputSchema: {
            type: 'object',
            properties: {
              fit: { type: 'string', enum: ['unisex', 'fitted'] },
              size: { type: 'string', enum: ['S', 'M', 'L', 'XL'] },
            },
            required: ['fit', 'size'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input) {
            const candidate = input as { fit?: string; size?: string };
            if (!candidate || !['unisex', 'fitted'].includes(candidate.fit || '') || !sizes.includes(candidate.size as Size)) {
              throw new Error('Choose fit unisex/fitted and size S/M/L/XL.');
            }
            const selectedFit = candidate.fit as Fit;
            const selectedSize = candidate.size as Size;
            const capturedAt = Date.now();
            setFit(selectedFit);
            setSize(selectedSize);
            setTime(capturedAt);
            setLoading(true);
            const url = await createCheckout(selectedFit, selectedSize, capturedAt);
            window.location.assign(url);
            return { status: 'redirecting_to_checkout', fit: selectedFit, size: selectedSize, timestamp: capturedAt };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  async function startCheckout() {
    const capturedAt = Date.now();
    setTime(capturedAt);
    setLoading(true);
    setError('');

    try {
      const url = await createCheckout(fit, size, capturedAt);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Time broke. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="ticker" aria-hidden="true">
        <div>BREAKING: TIME CONTINUES TO PASS • BIG IF TRUE • YOUR SHIRT CAN STOP ONE MILLISECOND • BREAKING: TIME CONTINUES TO PASS • BIG IF TRUE • YOUR SHIRT CAN STOP ONE MILLISECOND •</div>
      </div>

      <header className="masthead">
        <a className="brand" href="#top" aria-label="datetime.store home">
          datetime<span>.store</span>
        </a>
        <p className="edition">ISSUE No. {new Date().getFullYear()} • UPDATED CONSTANTLY</p>
        <div className="trust-stamp">100% REAL<br />TIME*</div>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">The internet&apos;s least necessary store</p>
        <h1>We sell a t-shirt with the current datetime.</h1>
        <p className="dek">That&apos;s it. That&apos;s the business model.</p>
      </section>

      <section className="shop" aria-label="Configure your shirt">
        <Shirt fit={fit} time={time} />

        <div className="order-panel">
          <div className="live-row">
            <span className="live-dot" /> LIVE PRODUCT
            <span>{time ? 'regret window: open' : 'consulting clock…'}</span>
          </div>

          <fieldset>
            <legend>1. Pick a silhouette</legend>
            <div className="choice-grid fit-grid">
              {fits.map((option) => (
                <label className={fit === option.value ? 'choice selected' : 'choice'} key={option.value}>
                  <input type="radio" name="fit" value={option.value} checked={fit === option.value} onChange={() => setFit(option.value)} />
                  <strong>{option.label}</strong>
                  <span>{option.note}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>2. Select your human dimensions</legend>
            <div className="choice-grid size-grid">
              {sizes.map((option) => (
                <label className={size === option ? 'choice selected' : 'choice'} key={option}>
                  <input type="radio" name="size" value={option} checked={size === option} onChange={() => setSize(option)} />
                  <strong>{option}</strong>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="receipt">
            <div><span>Black shirt</span><strong>$22.50</strong></div>
            <div><span>Freeze one millisecond</span><strong>FREE</strong></div>
            <div><span>Shipping</span><strong>$0.00</strong></div>
            <div className="total"><span>Total</span><strong>$22.50</strong></div>
          </div>

          <button className="buy-button" type="button" onClick={startCheckout} disabled={loading || !time}>
            <span>{loading ? 'OPENING TIME PORTAL…' : 'BUY THIS EXACT MILLISECOND'}</span>
            <span aria-hidden="true">→</span>
          </button>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <p className="fine-print">Secure test checkout by Stripe. Printed nowhere real yet by Prodigi&apos;s sandbox. Time itself remains unregulated.</p>
        </div>
      </section>

      <section className="explanation">
        <p className="eyebrow">Frequently avoided questions</p>
        <div className="facts">
          <article><span>01</span><h2>What is it?</h2><p>A black cotton t-shirt with the Unix timestamp from checkout printed across the chest. A receipt, but fashion.</p></article>
          <article><span>02</span><h2>Will it stay current?</h2><p>Absolutely not. It becomes outdated almost instantly, which is how you know it&apos;s authentic.</p></article>
          <article><span>03</span><h2>Why?</h2><p>Some moments deserve to be remembered. Others deserve direct-to-garment printing.</p></article>
        </div>
      </section>

      <footer>
        <span>datetime.store</span>
        <p>*Time accuracy depends on the clock inside your rectangle.</p>
        <a href="https://github.com/michelle/datetime.store" target="_blank" rel="noreferrer">the 2017 original ↗</a>
      </footer>
    </main>
  );
}
