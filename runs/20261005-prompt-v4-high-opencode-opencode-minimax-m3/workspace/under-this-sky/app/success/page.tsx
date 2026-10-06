"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface OrderStatus {
  id: string;
  status: string;
  prodigiOrderId?: string;
  prodigiOutcome?: string;
  error?: string;
  updatedAt?: string;
}

export default function SuccessPage() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const orderIdParam = sp.get("orderId") ?? sp.get("order") ?? null;
    const sessionIdParam =
      sp.get("session_id") ?? sp.get("sessionId") ?? sp.get("demoSessionId") ?? null;
    setOrderId(orderIdParam);
    setSessionId(sessionIdParam);
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/order-status/${encodeURIComponent(orderId)}`);
        if (!res.ok) {
          if (cancelled) return;
          setPollError(`status ${res.status}`);
          return;
        }
        const data = (await res.json()) as OrderStatus;
        if (!cancelled) setStatus(data);
        if (data.status === "submitted" || data.status === "error") return;
      } catch (e) {
        if (!cancelled) setPollError((e as Error).message);
      }
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [orderId]);

  return (
    <main className="min-h-screen bg-inkDeep text-parchment">
      <header className="border-b border-gold/15 py-4">
        <div className="container-narrow flex justify-between items-center">
          <Link href="/" className="label-display text-gold text-sm">
            Under · This · Sky
          </Link>
          <Link href="/design" className="text-xs text-parchment/60 uppercase tracking-widest hover:text-gold">
            ← design another
          </Link>
        </div>
      </header>

      <section className="container-narrow py-16 text-center">
        {orderId ? (
          <StatusBlock status={status} pollError={pollError} orderId={orderId} sessionId={sessionId} />
        ) : (
          <Fragment>
            <p className="label-display text-gold text-xs mb-4">
              Payment received
            </p>
            <h1 className="h-display text-4xl md:text-6xl mb-4">
              Thank you.
            </h1>
            <p className="text-parchment/70 italic mb-8 max-w-xl mx-auto">
              We're sending your order to the print lab. Keep this window open — this page updates as
              production progresses.
            </p>
          </Fragment>
        )}
        <p className="text-parchment/50 italic mt-12 text-sm">
          Need a hand? <a href="mailto:hello@under-this-sky.example" className="text-gold underline">hello@under-this-sky.example</a>
        </p>
      </section>
    </main>
  );
}

function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function StatusBlock({
  status,
  pollError,
  orderId,
  sessionId,
}: {
  status: OrderStatus | null;
  pollError: string | null;
  orderId: string;
  sessionId: string | null;
}) {
  const stage = status?.status ?? "checking";
  const stageLabel: Record<string, string> = {
    awaiting_payment: "Awaiting payment",
    paid: "Paid — submitting to print lab",
    submitted: "Submitted to Prodigi",
    error: "Something went wrong",
    cancelled: "Cancelled",
    checking: "Checking order status…",
  };
  const stageColor: Record<string, string> = {
    awaiting_payment: "bg-amber-400/20 text-amber-200 border-amber-400/40",
    paid: "bg-blue-400/20 text-blue-200 border-blue-400/40",
    submitted: "bg-emerald-400/20 text-emerald-200 border-emerald-400/40",
    error: "bg-rose-400/20 text-rose-100 border-rose-400/50",
    cancelled: "bg-gray-400/20 text-gray-200 border-gray-400/40",
    checking: "bg-parchment/10 text-parchment border-parchment/30",
  };

  return (
    <div>
      <p className="label-display text-gold text-xs mb-4">Your order</p>
      <h1 className="h-display text-4xl md:text-6xl mb-4">It’s on its way.</h1>
      <p className="text-parchment/70 italic mb-8 max-w-xl mx-auto">
        Order <code className="text-gold">{orderId}</code> has been received.
      </p>

      <div className={`mx-auto max-w-md rounded-full border px-5 py-2 inline-flex items-center gap-2 ${stageColor[stage] ?? stageColor.checking}`}>
        <span className="text-xs uppercase tracking-widest">
          {stageLabel[stage] ?? stage}
        </span>
        {stage !== "submitted" && stage !== "error" && (
          <span className="inline-block w-2 h-2 rounded-full bg-current animate-twinkle" />
        )}
      </div>

      {status?.prodigiOrderId && (
        <p className="mt-8 text-parchment/80">
          Prodigi order <code className="text-gold">{status.prodigiOrderId}</code>{" "}
          (outcome <code>{status.prodigiOutcome}</code>) — print lab will now
          start production.
        </p>
      )}

      {status?.error && (
        <p className="mt-8 text-rose">{status.error}</p>
      )}
      {pollError && (
        <p className="mt-4 text-parchment/40 italic text-xs">
          (status poll: {pollError})
        </p>
      )}

      {sessionId && (
        <p className="mt-4 text-parchment/40 italic text-xs">
          Stripe session: <code>{sessionId}</code>
        </p>
      )}
    </div>
  );
}
