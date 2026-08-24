"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FulfillResult =
  | { status: "unpaid" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      prodigiOrderId: string;
      prodigiStage: string;
      artworkUrl: string;
      style: string;
      size: string;
      color: string;
      orderedAtMs: number;
      amountTotal: number | null;
      currency: string | null;
      recipientName: string;
    };

export function OrderStatus({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<FulfillResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/fulfill?session_id=${encodeURIComponent(sessionId)}`);
        const payload = (await res.json()) as FulfillResult;
        if (cancelled) return;
        setResult(payload);
        if (payload.status === "unpaid" && attempt < 8) {
          setTimeout(() => setAttempt((a) => a + 1), 1500);
        }
      } catch {
        if (!cancelled) setResult({ status: "error", message: "Could not reach the server." });
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, attempt]);

  if (!result) {
    return <StatusShell title="CONFIRMING PAYMENT…">Hang tight while we confirm your order with Stripe.</StatusShell>;
  }

  if (result.status === "unpaid") {
    return (
      <StatusShell title="CONFIRMING PAYMENT…">
        This can take a few seconds. If this doesn&rsquo;t resolve, check your email for a Stripe receipt.
      </StatusShell>
    );
  }

  if (result.status === "error") {
    return (
      <StatusShell title="SOMETHING WENT WRONG" tone="error">
        {result.message} Your payment may still have succeeded — check your email for a Stripe receipt, or
        contact support with your session ID:
        <div className="mt-2 font-mono text-xs text-neutral-500 break-all">{sessionId}</div>
      </StatusShell>
    );
  }

  const amount =
    result.amountTotal != null && result.currency
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: result.currency }).format(
          result.amountTotal / 100
        )
      : null;

  return (
    <div className="flex flex-col items-center text-center gap-6 py-16 px-6">
      <div className="font-mono text-sm tracking-widest text-orange-400">ORDER CONFIRMED</div>
      <h1 className="text-3xl font-bold max-w-lg">
        Thanks, {result.recipientName.split(" ")[0]} — your moment is being printed.
      </h1>
      <p className="text-neutral-400 max-w-md">
        Order <span className="font-mono text-neutral-200">{result.prodigiOrderId}</span> was sent to Prodigi
        {amount ? ` for ${amount}` : ""}. Status: <span className="font-mono">{result.prodigiStage}</span>.
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={result.artworkUrl}
        alt="Your printed artwork"
        className="w-64 rounded-2xl border border-neutral-800 shadow-2xl"
      />

      <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-neutral-400 font-mono">
        <dt>Style</dt>
        <dd className="text-neutral-200">{result.style}</dd>
        <dt>Size</dt>
        <dd className="text-neutral-200">{result.size}</dd>
        <dt>Color</dt>
        <dd className="text-neutral-200">{result.color}</dd>
        <dt>Printed at</dt>
        <dd className="text-neutral-200">{new Date(result.orderedAtMs).toISOString()}</dd>
      </dl>

      <Link
        href="/"
        className="mt-4 rounded-full bg-orange-500 hover:bg-orange-400 text-neutral-950 font-semibold px-6 py-3 font-mono"
      >
        GET ANOTHER SHIRT
      </Link>
    </div>
  );
}

function StatusShell({
  title,
  tone = "default",
  children,
}: {
  title: string;
  tone?: "default" | "error";
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-24 px-6">
      <div
        className={`font-mono text-sm tracking-widest ${
          tone === "error" ? "text-red-400" : "text-neutral-500"
        }`}
      >
        {title}
      </div>
      <p className="text-neutral-400 max-w-md">{children}</p>
    </div>
  );
}
