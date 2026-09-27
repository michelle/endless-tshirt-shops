"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Status {
  paid: boolean;
  paymentStatus?: string;
  prodigiOrderId?: string;
  fulfillment?: string;
  stage?: string;
}

function ProgressLine({
  state,
  label,
  detail,
}: { state: "done" | "active" | "idle"; label: string; detail?: string }) {
  return (
    <li className={state}>
      <span>{label}</span>
      {detail && <span className="mono">{detail}</span>}
      <span className="state">
        {state === "done" ? "done" : state === "active" ? "working…" : "—"}
      </span>
    </li>
  );
}

function ReceiptBody() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const [status, setStatus] = useState<Status | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    const started = Date.now();

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/order-status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data: Status = await res.json();
          if (!stop) setStatus(data);
        }
      } catch {
        /* transient — next tick will retry */
      }
      if (!stop) {
        if (Date.now() - started > 90_000) {
          setStale(true);
          return;
        }
        setTimeout(tick, 2500);
      }
    };
    tick();
    return () => {
      stop = true;
    };
  }, [sessionId]);

  const paid = status?.paid ?? false;
  const sent = Boolean(status?.prodigiOrderId);

  return (
    <div className="receipt">
      <svg className="moonicon" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <clipPath id="half">
            <path d="M60,6 A54,54 0 1,1 60,114 A38,54 0 1,0 60,6 Z" />
          </clipPath>
        </defs>
        <circle cx="60" cy="60" r="54" fill="none" stroke="#c9a25c" strokeWidth="3" opacity="0.7" />
        <circle cx="60" cy="60" r="54" fill="#f2e9d6" clipPath="url(#half)" />
        <circle cx="60" cy="26" r="4" fill="#c9a25c" />
        <circle cx="86" cy="48" r="3" fill="#c9a25c" />
        <circle cx="78" cy="84" r="2.5" fill="#c9a25c" />
      </svg>

      <h1>{paid ? "The moon is yours." : "One moment…"}</h1>

      {!sessionId && (
        <p>This page needs a checkout session. If you just paid, head back to the store.</p>
      )}

      {sessionId && (
        <>
          <p>
            {paid
              ? "Payment received — thank you. Your shirt is on its way to the print network; it only ever leaves after payment clears."
              : "Your payment is still settling (or was not completed). If you cancelled, your moon is waiting back at the store."}
          </p>

          <div className="progress">
            <ol>
              <ProgressLine state={paid ? "done" : "active"} label="Payment (Stripe)" />
              <ProgressLine
                state={sent ? "done" : paid ? "active" : "idle"}
                label="Sent to the print network (Prodigi)"
              />
              <ProgressLine
                state={sent ? "active" : "idle"}
                label="Printed & shipped"
                detail={status?.prodigiOrderId}
              />
            </ol>
          </div>

          {stale && (
            <p>
              This page stopped polling after 90 seconds. Your order is safe —
              if it was paid, it will reach the print network automatically.
            </p>
          )}

          <p>
            <a href="/">Back to the store</a>
          </p>
        </>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <ReceiptBody />
    </Suspense>
  );
}
