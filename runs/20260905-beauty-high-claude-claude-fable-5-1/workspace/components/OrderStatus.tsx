"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COLOR_INFO, STYLE_INFO, isColor, isStyle } from "@/lib/catalog";

interface Status {
  sessionId: string;
  status: string | null;
  paymentStatus: string | null;
  ts: number | null;
  style: string | null;
  color: string | null;
  size: string | null;
  tz: string | null;
  email: string | null;
  name: string | null;
  amountTotal: number | null;
  currency: string | null;
  sandbox: boolean;
  fulfillment: {
    state: string;
    reason?: string | null;
    prodigiOrderId?: string | null;
    stage?: string | null;
    details?: Record<string, string> | null;
    issues?: { description?: string; errorCode?: string }[];
    shipments?: { id: string; carrier: string | null; service: string | null; tracking: string | null; dispatchDate: string | null }[];
  };
  error?: string;
}

const STAGE_COPY: Record<string, string> = {
  created: "Sent to the printer just now.",
  exists: "With the printer.",
  InProgress: "Being printed.",
  Complete: "Printed and shipped.",
  Cancelled: "Cancelled.",
  Draft: "Waiting at the printer.",
};

export default function OrderStatus({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/${sessionId}`)
      .then(async (r) => {
        const j = (await r.json()) as Status;
        if (cancelled) return;
        setData(j);
        if (!r.ok && j.fulfillment?.state !== "error") setErr(j.error || `Couldn't load the order (${r.status}).`);
        else setErr(null);
      })
      .catch((e) => !cancelled && setErr((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [sessionId, tick]);

  // Poll while the printer hasn't answered yet.
  useEffect(() => {
    if (!data) return;
    const f = data.fulfillment?.state;
    const settled = data.paymentStatus === "paid" && (f === "exists" || f === "created") && data.fulfillment.stage;
    if (settled || f === "unconfigured" || f === "skipped") return;
    const id = setTimeout(() => setTick((t) => t + 1), 4000);
    return () => clearTimeout(id);
  }, [data]);

  if (err && !data) {
    return (
      <section className="section">
        <h2>Hmm.</h2>
        <p className="error">{err}</p>
        <button className="btn ghost" onClick={() => setTick((t) => t + 1)}>
          Try again
        </button>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="section">
        <h2>
          <span className="dot pulse" />
          Finding your moment…
        </h2>
      </section>
    );
  }

  const paid = data.paymentStatus === "paid";
  const ts = data.ts;
  const style = isStyle(data.style) ? data.style : "unisex";
  const color = isColor(data.color) ? data.color : "black";
  const f = data.fulfillment;
  const stage = f?.stage || (f?.state === "created" ? "created" : null);
  const human = ts
    ? `${new Date(ts).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${new Date(ts).toLocaleTimeString(undefined, { hour12: false })}.${String(ts % 1000).padStart(3, "0")}`
    : null;

  if (!paid) {
    return (
      <section className="section">
        <h2>
          Not paid <em>yet</em>.
        </h2>
        <p className="hero-sub">
          This session is {data.status ?? "unknown"} / {data.paymentStatus ?? "unknown"}. If you closed checkout early, your moment
          is still waiting on the front page.
        </p>
        <Link href="/" className="btn">
          ← Back to now
        </Link>
      </section>
    );
  }

  return (
    <section className="thanks">
      <div>
        <h1 className="hero-title">
          Congrats on your <em>pretty cool</em> shirt.
        </h1>
        <p className="hero-sub">You now own a moment nobody else can have. It looked like this:</p>
        {ts && <div className="big-ts">{ts}</div>}
        {human && (
          <p className="moment-readout" style={{ textAlign: "left", margin: "0.4rem 0 0" }}>
            {human}
            <small>{data.tz ? `frozen in ${data.tz.replace(/_/g, " ")}` : ""}</small>
          </p>
        )}

        <ul className="status-list">
          <li>
            <span>Shirt</span>
            <span>
              {STYLE_INFO[style].label} · {COLOR_INFO[color].label} · {data.size}
            </span>
          </li>
          <li>
            <span>Paid</span>
            <span>
              {data.amountTotal != null && data.currency
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency.toUpperCase() }).format(data.amountTotal / 100)
                : "—"}
              {data.email ? ` · receipt to ${data.email}` : ""}
            </span>
          </li>
          <li>
            <span>Printer</span>
            <span>
              {f.state === "error" ? (
                <>
                  <span className="dot pulse" />
                  Retrying… ({f.reason})
                </>
              ) : f.state === "unconfigured" ? (
                "Not connected on this deployment."
              ) : f.state === "skipped" ? (
                `Needs a human: ${f.reason}`
              ) : stage ? (
                <>
                  {(stage === "InProgress" || stage === "created" || stage === "Draft") && <span className="dot pulse" />}
                  {STAGE_COPY[stage] ?? stage}
                </>
              ) : (
                <>
                  <span className="dot pulse" />
                  Handing off…
                </>
              )}
            </span>
          </li>
          {f.prodigiOrderId && (
            <li>
              <span>Print order</span>
              <span className="mono">{f.prodigiOrderId}</span>
            </li>
          )}
          {f.shipments && f.shipments.length > 0 && (
            <li>
              <span>Shipment</span>
              <span>
                {f.shipments.map((s) => (
                  <span key={s.id}>
                    {s.carrier ?? "Carrier"} {s.service ? `· ${s.service}` : ""}{" "}
                    {s.tracking && /^https?:/.test(s.tracking) ? (
                      <a href={s.tracking} target="_blank" rel="noreferrer">
                        track
                      </a>
                    ) : (
                      s.tracking
                    )}
                  </span>
                ))}
              </span>
            </li>
          )}
          {f.issues && f.issues.length > 0 && (
            <li>
              <span>Issues</span>
              <span>{f.issues.map((i) => i.description || i.errorCode).join("; ")}</span>
            </li>
          )}
          <li>
            <span>Reference</span>
            <span className="mono" style={{ fontSize: "0.75rem" }}>
              {data.sessionId}
            </span>
          </li>
        </ul>

        {data.sandbox && (
          <p className="fine">
            <span className="pill warn">test mode</span> This order went to the Prodigi sandbox. No shirt will be printed or shipped.
          </p>
        )}

        <Link href="/" className="btn">
          ♥ Get another moment
        </Link>
      </div>

      <div>
        {ts && (
          <figure className="proof" style={{ margin: 0 }}>
            <img src={`/art/${ts}.png?preview=1&bg=${color}`} alt={`Preview of the print: ${ts} on a ${color} shirt`} width={600} height={750} />
            <figcaption className="proof-cap">
              <span>What the printer receives, more or less.</span>
              <a href={`/art/${ts}.png?ink=${COLOR_INFO[color].ink}`} target="_blank" rel="noreferrer">
                exact print file ↗
              </a>
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
