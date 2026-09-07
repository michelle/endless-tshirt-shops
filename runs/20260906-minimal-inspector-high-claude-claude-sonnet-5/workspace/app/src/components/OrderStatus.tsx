"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface OrderInfo {
  paymentStatus: string;
  style: string | null;
  size: string | null;
  timestamp: string | null;
  email: string | null;
  prodigiOrderId: string | null;
  prodigiStage: string | null;
  prodigiError: string | null;
}

const POLL_MS = 2500;
const MAX_POLLS = 16; // ~40s

export default function OrderStatus({
  paymentIntentId,
}: {
  paymentIntentId: string;
}) {
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const pollsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${paymentIntentId}`, {
          cache: "no-store",
        });
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data: OrderInfo = await res.json();
        if (cancelled) return;
        setOrder(data);

        const needsMoreFulfillmentInfo =
          data.paymentStatus === "succeeded" &&
          !data.prodigiOrderId &&
          !data.prodigiError;

        pollsRef.current += 1;
        if (needsMoreFulfillmentInfo && pollsRef.current < MAX_POLLS) {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch {
        // Network hiccup — try again shortly.
        timer = setTimeout(poll, POLL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentIntentId]);

  if (notFound) {
    return (
      <Result title="We couldn't find that order.">
        <HomeLink />
      </Result>
    );
  }

  if (!order) {
    return <Result title="Looking up your order…" />;
  }

  if (order.paymentStatus !== "succeeded" && order.paymentStatus !== "processing") {
    return (
      <Result title="That payment didn't go through.">
        <p className="text-zinc-400">
          Status: <span className="font-mono">{order.paymentStatus}</span>
        </p>
        <HomeLink label="Try again" />
      </Result>
    );
  }

  const date = order.timestamp ? new Date(Number(order.timestamp)) : null;

  return (
    <Result title="Congrats on your pretty cool shirt!">
      <p className="max-w-sm text-zinc-400">
        {order.email ? (
          <>
            We&rsquo;ll email <span className="text-zinc-200">{order.email}</span>{" "}
            your receipt and tracking.
          </>
        ) : (
          "You'll get an email receipt shortly."
        )}
      </p>

      <div className="mt-6 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 text-left font-mono text-sm">
        <Row label="Style" value={order.style === "fitted" ? "Fitted" : "Unisex"} />
        <Row label="Size" value={order.size ?? "—"} />
        <Row
          label="Printed"
          value={order.timestamp ?? "—"}
        />
        {date ? <Row label="At" value={date.toISOString()} /> : null}
        <Row label="Payment" value={order.paymentStatus} />
        <Row
          label="Fulfillment"
          value={
            order.prodigiError
              ? "Needs attention"
              : order.prodigiOrderId
              ? `${order.prodigiStage ?? "In progress"} (${order.prodigiOrderId})`
              : "Sending to print…"
          }
        />
      </div>

      {order.prodigiError ? (
        <p className="mt-4 max-w-sm rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
          Your payment went through, but we hit a snag queuing the print job.
          We&rsquo;ve been notified and will follow up by email — no action
          needed from you.
        </p>
      ) : null}

      <HomeLink label="Get another shirt" />
    </Result>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 py-2 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate text-zinc-200">{value}</span>
    </div>
  );
}

function Result({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex max-w-md flex-col items-center gap-2 text-center">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {children}
    </div>
  );
}

function HomeLink({ label = "Get another shirt" }: { label?: string }) {
  return (
    <Link
      href="/"
      className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300"
    >
      {label}
    </Link>
  );
}
