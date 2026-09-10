"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/CartContext";

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const cart = useCart();
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!cleared && cart.ready && cart.items.length) {
      cart.clear();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot guard, not a render loop
      setCleared(true);
    }
  }, [cart, cleared]);

  useEffect(() => {
    if (!sessionId) return;
    let attempts = 0;
    let cancelled = false;

    async function poll() {
      attempts++;
      try {
        const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`);
        if (!res.ok) throw new Error("Could not load order status");
        const json = await res.json();
        if (cancelled) return;
        setData(json);
        if (json.fulfillment === "processing" && attempts < 6) {
          setTimeout(poll, 2000);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-serif-display text-3xl mb-4">No order found</h1>
        <Link href="/design" className="underline">Start a new design →</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <p className="text-amber-300 text-sm uppercase tracking-[0.3em] mb-4">✦ Order Confirmed</p>
      <h1 className="font-serif-display text-4xl mb-4">Your sky is being printed.</h1>

      {error && <p className="text-red-300 text-sm">{error}</p>}

      {!data && !error && <p className="text-white/60">Confirming your payment…</p>}

      {data && data.paid && (
        <div className="text-left mt-8 space-y-4">
          {data.items.map((item, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-4 flex justify-between">
              <div>
                <p className="font-medium">
                  “{item.phrase}”{item.subtitle ? ` — ${item.subtitle}` : ""}
                </p>
                <p className="text-sm text-white/50">
                  {item.color} · {item.size?.toUpperCase()} · Qty {item.copies}
                </p>
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
            {data.fulfillment === "submitted_to_print" || data.fulfillment === "print_status_update" ? (
              <p>✓ Sent to our print partner {data.prodigiOrderId ? `(order ${data.prodigiOrderId})` : ""}.</p>
            ) : data.fulfillment === "prodigi_error" ? (
              <p className="text-red-300">
                Payment succeeded, but something went wrong sending this to print. Our team has
                been notified — reply to your receipt email and we&apos;ll sort it out.
              </p>
            ) : (
              <p>Payment received — sending to our print partner now…</p>
            )}
          </div>

          {data.email && (
            <p className="text-sm text-white/40 text-center">A receipt was sent to {data.email}.</p>
          )}
        </div>
      )}

      <Link href="/design" className="inline-block mt-10 underline text-white/60 hover:text-white">
        Design another →
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
