"use client";

import { use, useEffect, useState } from "react";
import { NavBar, Footer } from "@/components/NavBar";

type Status = {
  paymentStatus?: string;
  fulfillmentStatus?: string;
  prodigiOrderId?: string;
  fulfillmentError?: string;
  style?: string;
  color?: string;
  size?: string;
  locationLabel?: string;
  totalCents?: number;
  error?: string;
};

const STEPS = [
  { key: "paid", label: "Payment confirmed" },
  { key: "processing", label: "Sending to our print partner" },
  { key: "submitted", label: "In production at Prodigi" },
];

function stepIndex(status: Status): number {
  if (status.fulfillmentStatus === "submitted") return 2;
  if (status.fulfillmentStatus === "processing") return 1;
  if (status.paymentStatus === "succeeded") return 0;
  return -1;
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [status, setStatus] = useState<Status>({});
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/order-status/${id}`);
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        // ignore, will retry
      }
    }
    poll();
    const interval = setInterval(() => {
      setTries((t) => t + 1);
      poll();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  const idx = stepIndex(status);
  const failed = status.fulfillmentStatus === "failed";
  const stillPolling = idx < 2 && !failed && tries < 40;

  return (
    <>
      <NavBar />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-16">
          {status.error ? (
            <p className="text-red-300">Couldn&apos;t find that order.</p>
          ) : (
            <>
              <h1 className="text-3xl font-serif font-semibold mb-2">Thank you!</h1>
              <p className="text-white/60 mb-10">
                Order <span className="font-mono text-white/80">{id}</span>
                {status.locationLabel ? <> — your sky over {status.locationLabel}</> : null}
              </p>

              <ol className="space-y-6">
                {STEPS.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-4">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        i <= idx
                          ? "bg-amber-200 text-[#050814]"
                          : "bg-white/10 text-white/40 border border-white/20"
                      }`}
                    >
                      {i <= idx ? "✓" : i + 1}
                    </span>
                    <span className={i <= idx ? "text-white" : "text-white/40"}>{s.label}</span>
                  </li>
                ))}
              </ol>

              {failed && (
                <div className="mt-10 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-200 text-sm">
                  We hit a snag sending your order to print
                  {status.fulfillmentError ? `: ${status.fulfillmentError}` : "."} Your payment is
                  safe — this will be retried automatically, or contact support and reference this
                  order id.
                </div>
              )}

              {stillPolling && !failed && idx < 2 && (
                <p className="text-white/40 text-sm mt-8">
                  This updates automatically — usually within a few seconds.
                </p>
              )}

              {status.totalCents !== undefined && (
                <div className="mt-12 rounded-xl bg-white/5 border border-white/10 px-5 py-4 text-sm space-y-1">
                  <p className="text-white/70">
                    {status.style} · {status.color} · {status.size?.toUpperCase()}
                  </p>
                  <p className="text-white/70">Total charged: ${(status.totalCents / 100).toFixed(2)}</p>
                  {status.prodigiOrderId && (
                    <p className="text-white/50">Print order: {status.prodigiOrderId}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
