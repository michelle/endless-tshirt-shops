"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrderStatus } from "@/lib/orderStatus";
import { STYLE_LABELS, isShirtStyle } from "@/lib/config";
import { describeTimestamp } from "@/lib/time";
import { Shirt } from "./Shirt";
import { LiveClock } from "./LiveClock";

const POLL_MS = 8000;
const POLL_LIMIT = 40; // ~5 minutes, then we let the page rest

function isSettled(s: OrderStatus): boolean {
  if (s.payment !== "succeeded" && s.payment !== "processing") return true;
  if (s.fulfillment === "failed") return false;
  const key = s.prodigi?.key;
  return key === "shipped" || key === "done" || key === "cancelled";
}

export function OrderView({ initial, secret }: { initial: OrderStatus; secret: string }) {
  const [status, setStatus] = useState<OrderStatus>(initial);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (isSettled(status) || polls >= POLL_LIMIT) return;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/order/${status.id}?secret=${encodeURIComponent(secret)}`, {
          cache: "no-store",
        });
        if (res.ok) setStatus((await res.json()) as OrderStatus);
      } catch {
        // The network is a river. We'll try again.
      } finally {
        setPolls((n) => n + 1);
      }
    }, POLL_MS);
    return () => clearTimeout(id);
  }, [status, polls, secret]);

  const style = isShirtStyle(status.style) ? status.style : "unisex";
  const paid = status.payment === "succeeded";
  const processing = status.payment === "processing";
  const failedPayment = !paid && !processing;

  const printer = status.prodigi;
  const sentToPrinter = status.fulfillment === "fulfilled";
  const printing = printer?.key === "printing" || printer?.key === "shipped" || printer?.key === "done";
  const shipped = printer?.key === "shipped" || printer?.key === "done";

  return (
    <main className="page">
      <header className="page-header">
        <h1>
          <Link href="/">datetime.store</Link>
        </h1>
        <h2>
          {paid
            ? "congrats on your pretty cool shirt!"
            : processing
              ? "your payment is processing. your shirt is waiting patiently."
              : "that payment didn't go through. the shirt remains theoretical."}
        </h2>
      </header>

      <div className="order">
        <section aria-label="Your shirt">
          <Shirt style={style} frozenAt={status.timestamp} frozenNote={paid ? "yours, forever" : undefined} />
        </section>

        <section aria-label="Order status">
          <p className="order-title">Your datetime</p>
          <div className="order-number num">{status.timestamp}</div>
          <p className="muted small">
            {describeTimestamp(status.timestamp)}. This number was the current time for exactly one
            millisecond. Now it&rsquo;s on a shirt.
          </p>

          {failedPayment ? (
            <>
              <div className="notice error">
                Payment status: {status.payment.replace(/_/g, " ")}. Nothing was printed and nothing was
                charged.
              </div>
              <Link className="button-link" href="/">
                ← Try again with a fresher datetime
              </Link>
            </>
          ) : (
            <>
              <ol className="timeline">
                <li className={paid ? "done" : "active"}>
                  <span className="dot">{paid ? "✓" : "…"}</span>
                  <div>
                    <div className="label">{paid ? "Paid" : "Payment processing"}</div>
                    <div className="blurb">
                      {paid ? "Money moved. Time did too." : "Some payment methods take a while. Time does not."}
                    </div>
                  </div>
                </li>
                <li className={sentToPrinter ? "done" : status.fulfillment === "failed" ? "failed" : paid ? "active" : ""}>
                  <span className="dot">{sentToPrinter ? "✓" : status.fulfillment === "failed" ? "!" : "…"}</span>
                  <div>
                    <div className="label">Sent to the printer</div>
                    <div className="blurb">
                      {sentToPrinter
                        ? `Prodigi order ${printer?.id ?? status.id}.`
                        : status.fulfillment === "failed"
                          ? "The printer said no. We are retrying and a human has been alerted. Your payment is safe."
                          : "Handing over a very large PNG."}
                    </div>
                  </div>
                </li>
                <li className={shipped ? "done" : printing ? "active" : ""}>
                  <span className="dot">{shipped ? "✓" : printing ? "…" : ""}</span>
                  <div>
                    <div className="label">Printing</div>
                    <div className="blurb">
                      {printer && !shipped ? printer.blurb : "A machine will put your number on a shirt."}
                    </div>
                  </div>
                </li>
                <li className={shipped ? "done" : ""}>
                  <span className="dot">{shipped ? "✓" : ""}</span>
                  <div>
                    <div className="label">Shipped</div>
                    <div className="blurb">
                      {shipped ? (
                        printer?.tracking?.url ? (
                          <a href={printer.tracking.url} target="_blank" rel="noreferrer">
                            Track it ({printer.carrier?.name || "carrier"} {printer.tracking.number})
                          </a>
                        ) : (
                          "Your number is in a box, moving through space at a modest speed."
                        )
                      ) : (
                        "Standard shipping. A few business days, which is a lot of milliseconds."
                      )}
                    </div>
                  </div>
                </li>
              </ol>

              <div className="details">
                <dl>
                  <dt>Shirt</dt>
                  <dd>
                    {STYLE_LABELS[style]}, size {status.size}, black
                  </dd>
                  {status.shipTo ? (
                    <>
                      <dt>Ship to</dt>
                      <dd>
                        {status.shipTo.name}
                        {status.shipTo.city ? `, ${status.shipTo.city}` : ""}
                        {status.shipTo.country ? `, ${status.shipTo.country}` : ""}
                      </dd>
                    </>
                  ) : null}
                  {status.email ? (
                    <>
                      <dt>Receipt</dt>
                      <dd>{status.email}</dd>
                    </>
                  ) : null}
                  <dt>Order ref</dt>
                  <dd className="num">{status.id}</dd>
                  {printer?.stage ? (
                    <>
                      <dt>Printer says</dt>
                      <dd>{printer.label}</dd>
                    </>
                  ) : null}
                </dl>
              </div>

              <p className="muted small" style={{ marginTop: 18 }}>
                {isSettled(status)
                  ? "This page is done updating. Your shirt is not done being cool."
                  : polls >= POLL_LIMIT
                    ? "We stopped refreshing to save electricity. Reload for the latest."
                    : "This page refreshes itself. Bookmark it; it's the only place your order lives."}
              </p>
            </>
          )}

          <p style={{ marginTop: 24 }}>
            Meanwhile, it is now <LiveClock className="num" />. You could buy that one too.
          </p>
          <Link className="button-link" href="/">
            ♥ Get another shirt
          </Link>
        </section>
      </div>
    </main>
  );
}
