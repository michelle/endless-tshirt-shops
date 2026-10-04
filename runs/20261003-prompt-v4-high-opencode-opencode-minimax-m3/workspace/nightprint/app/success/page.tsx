'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SafeSvg } from '@/components/safe-svg';
import { generateSvg, PREVIEW_W, PREVIEW_H, type DesignInput } from '@/lib/design';

interface OrderStatus {
  orderId: string;
  status: 'draft' | 'paid' | 'submitted_to_prodigi' | 'fulfilled' | 'failed';
  prodigiOrderId?: string;
  error?: string;
}

export default function SuccessPage() {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const params = new URLSearchParams(search);
  const orderId = params.get('orderId') ?? '';
  const demo = params.get('demo') === '1';

  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);

  // Poll the order status until it's submitted_to_prodigi.
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/order-status/${encodeURIComponent(orderId)}`);
        if (!res.ok) {
          setPollError(`status ${res.status}`);
          return;
        }
        const json = (await res.json()) as OrderStatus;
        if (cancelled) return;
        setStatus(json);
        if (json.status === 'submitted_to_prodigi' || json.status === 'fulfilled' || json.status === 'failed') {
          return;
        }
        setTimeout(poll, 1500);
      } catch (err: any) {
        setPollError(err?.message ?? String(err));
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // For the design re-render, we use the SAME inputs by re-rendering
  // through the order-status endpoint's hidden fields when available.
  // For the success page we just show a friendly recap; the live print
  // quality file is preserved server-side for Prodigi.
  useEffect(() => {
    // Generate a celebratory star map local to the orderId as a keepsake
    const design: DesignInput = {
      when: new Date(),
      latitudeDeg: 0,
      longitudeDeg: 0,
      locationName: 'YOUR STARPRINT',
      message: 'Order complete\n— a unique\n✨ keepsake ✨',
      headline: 'Confirmed',
      palette: 'ink',
    };
    setPreviewSvg(generateSvg(design, { width: PREVIEW_W, height: PREVIEW_H }).svg);
  }, []);

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">Thank you</p>
        <h1 className="font-display text-5xl md:text-6xl mt-3 leading-tight">
          Your STARPRINT{' '}
          <span className="text-gold-500 italic">is on its way</span>
        </h1>

        <div className="mt-12 rounded-xl border border-ink-700 bg-ink-900/50 p-6 lg:p-8">
          <div className="flex flex-wrap items-baseline gap-4 justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-ink-400">Order ID</div>
              <div className="font-mono text-lg">{orderId || '—'}</div>
            </div>
            <StatusPill status={status?.status ?? 'paid'} />
          </div>

          <ol className="mt-8 space-y-4 text-sm text-ink-200">
            <Step label="Order received" complete />
            <Step
              label="Payment confirmed"
              complete={status?.status !== undefined && status.status !== 'draft'}
            />
            <Step
              label="Submitted to Prodigi"
              complete={
                status?.status === 'submitted_to_prodigi' ||
                status?.status === 'fulfilled'
              }
            />
            <Step
              label="In production (printing)"
              complete={status?.status === 'fulfilled'}
              hint="Prodigi prints from the lab closest to you. We'll email tracking once it ships."
            />
          </ol>

          {status?.error && (
            <p className="mt-4 text-sm text-rose-400">
              There was a problem with production: {status.error}
            </p>
          )}
          {pollError && (
            <p className="mt-4 text-xs text-ink-400">
              status poll error: {pollError}
            </p>
          )}
          {demo && (
            <p className="mt-6 text-xs text-ink-400">
              <strong className="text-gold-500">Demo mode:</strong> no payment was taken. This site
              is running without Stripe; in production the order above would have charged the
              customer via a real credit card, and the same flow would submit to Prodigi.
            </p>
          )}
        </div>

        <div className="mt-12 rounded-xl overflow-hidden border border-ink-700 bg-ink-950">
          {previewSvg && (
            <div className="aspect-[1200/1508]">
              <SafeSvg svg={previewSvg} className="h-full w-full" />
            </div>
          )}
        </div>

        <p className="mt-8 text-sm text-ink-400 leading-relaxed">
          ✨ We retain your print file for 30 days in case you want to
          re-order. Your design is unique — we do not resell or display your
          designs publicly.
        </p>
      </div>
      <Footer />
    </main>
  );
}

function StatusPill({ status }: { status: OrderStatus['status'] }) {
  const map = {
    draft:                { label: 'Created',         tone: 'bg-ink-700 text-ink-200' },
    paid:                 { label: 'Paid',            tone: 'bg-gold-500 text-ink-950' },
    submitted_to_prodigi: { label: 'In production',   tone: 'bg-emerald-500 text-emerald-50' },
    fulfilled:            { label: 'Shipped',         tone: 'bg-emerald-500 text-emerald-50' },
    failed:               { label: 'Failed',          tone: 'bg-rose-500 text-rose-50' },
  };
  const cur = map[status] ?? map.paid;
  return (
    <span className={'px-3 py-1.5 rounded-full text-xs font-medium ' + cur.tone}>
      {cur.label}
    </span>
  );
}

function Step({
  label,
  complete,
  hint,
}: {
  label: string;
  complete?: boolean;
  hint?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={
          'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ' +
          (complete ? 'bg-gold-500 text-ink-950' : 'border border-ink-700 text-ink-400')
        }
      >
        {complete ? '✓' : '·'}
      </span>
      <span>
        <span className={complete ? 'text-ink-100' : 'text-ink-400'}>{label}</span>
        {hint && <span className="ml-2 text-xs text-ink-500">{hint}</span>}
      </span>
    </li>
  );
}
