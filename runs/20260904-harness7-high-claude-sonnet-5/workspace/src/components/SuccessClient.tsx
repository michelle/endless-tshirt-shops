"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SIZES, STYLES, isSizeId, isStyleId } from "@/lib/products";

interface OrderStatus {
  paymentStatus: string;
  style: string | null;
  size: string | null;
  ts: string | null;
  customerEmail: string | null;
  prodigiOrderId: string | null;
  prodigiStatus: string | null;
}

const MAX_POLLS = 15;
const POLL_INTERVAL_MS = 2000;

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/order-status?session_id=${sessionId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setFetchError(data.error || "Could not look up your order.");
          return;
        }
        setStatus(data);
        if (!data.prodigiOrderId && pollCount < MAX_POLLS) {
          timerRef.current = setTimeout(() => {
            setPollCount((c) => c + 1);
          }, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setFetchError("Could not look up your order.");
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, pollCount]);

  if (!sessionId) {
    return (
      <div className="text-center">
        <p className="text-white/70">Missing checkout session.</p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Back to the shop
        </Link>
      </div>
    );
  }

  if (fetchError) {
    return <p className="text-center text-red-400">{fetchError}</p>;
  }

  if (!status) {
    return <p className="text-center text-white/60">Loading your order…</p>;
  }

  if (status.paymentStatus !== "paid") {
    return (
      <div className="text-center">
        <p className="text-white/70">
          We&rsquo;re still waiting for payment confirmation.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Back to the shop
        </Link>
      </div>
    );
  }

  const styleLabel = isStyleId(status.style) ? STYLES[status.style].label : status.style;
  const sizeLabel = isSizeId(status.size) ? SIZES[status.size].label : status.size;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-black">
        ✓
      </div>
      <h1 className="text-2xl font-bold text-white">
        Congrats on your pretty cool shirt!
      </h1>
      <p className="mt-2 max-w-md text-white/60">
        We emailed a receipt{status.customerEmail ? ` to ${status.customerEmail}` : ""}.
        Your {styleLabel} tee (size {sizeLabel}) is printed with the exact
        millisecond you bought it: <span className="font-mono">{status.ts}</span>.
      </p>

      {status.ts && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/artwork?ts=${status.ts}&style=${status.style ?? "unisex"}`}
          alt="Your shirt artwork"
          className="mt-6 w-48 rounded-lg border border-white/10 bg-neutral-900"
        />
      )}

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm">
        {status.prodigiOrderId ? (
          <p className="text-white/80">
            Fulfillment order{" "}
            <span className="font-mono text-white">{status.prodigiOrderId}</span>{" "}
            placed with Prodigi (sandbox).
          </p>
        ) : (
          <p className="text-white/60">
            Finalizing your order with our print partner…
          </p>
        )}
      </div>

      <Link
        href="/"
        className="mt-8 inline-block rounded-full border border-white/20 px-5 py-2 text-sm text-white hover:border-white/40"
      >
        Get another shirt
      </Link>
    </div>
  );
}
