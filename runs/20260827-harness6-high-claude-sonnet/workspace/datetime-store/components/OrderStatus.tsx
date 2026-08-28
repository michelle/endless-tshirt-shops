"use client";

import { useEffect, useState } from "react";

type Status = {
  prodigiOrderId: string | null;
  prodigiStatus: string;
  prodigiError: string | null;
};

export default function OrderStatus({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/order-status?session_id=${sessionId}`);
        const data = await res.json();
        if (cancelled) return;
        setStatus(data);
        const done = data.prodigiOrderId || data.prodigiError || attempts >= 8;
        if (!done) {
          timer = setTimeout(() => {
            setAttempts((a) => a + 1);
          }, 2500);
        }
      } catch {
        // silently retry on next tick
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId, attempts]);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white px-6 py-5 text-left">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-black/40 mb-2">
        Fulfillment status
      </p>
      {status?.prodigiOrderId ? (
        <p className="text-sm text-emerald-700 font-medium">
          ✓ Sent to print — Prodigi order{" "}
          <span className="font-mono">{status.prodigiOrderId}</span>
        </p>
      ) : status?.prodigiError ? (
        <p className="text-sm text-amber-700 font-medium">
          Payment succeeded — our team is manually placing your print order
          (fulfillment hiccup). You&rsquo;ll still get your shirt.
        </p>
      ) : (
        <p className="text-sm text-black/50">
          Queuing your print order with Prodigi…
        </p>
      )}
    </div>
  );
}
