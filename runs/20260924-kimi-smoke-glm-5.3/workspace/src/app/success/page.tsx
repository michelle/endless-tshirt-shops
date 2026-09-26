"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Status {
  id: string;
  paid: boolean;
  amountTotal: number | null;
  currency: string | null;
  email: string | null;
  artworkUrl: string | null;
  prodigi: null | {
    orderId?: string;
    stage?: string;
    details?: Record<string, string>;
    issues?: string[];
    shipments?: Array<{ status?: string; carrier?: string; trackingUrl?: string }>;
  };
}

const STAGE_COPY: Record<string, string> = {
  InProgress: "Your shirt is moving through the print network.",
  Complete: "Printed, packed and on its way.",
  Cancelled: "This order was cancelled — contact support.",
  OnHold: "Your order is on hold — contact support.",
};

function DetailDots({ details }: { details?: Record<string, string> }) {
  const steps: Array<[string, string]> = [
    ["Downloaded your artwork", "downloadAssets"],
    ["Prepared print-ready files", "printReadyAssetsPrepared"],
    ["Allocated a print lab", "allocateProductionLocation"],
    ["In production", "inProduction"],
    ["Shipping", "shipping"],
  ];
  const done = (v?: string) => v === "Complete" || v === "Ok";
  const inProg = (v?: string) => v === "InProgress" || v === "Ok";
  return (
    <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none" }}>
      {steps.map(([label, key]) => {
        const v = details?.[key];
        const cls = done(v) ? "done" : inProg(v) ? "pend" : "pend";
        const mark = done(v) ? "✓" : inProg(v) ? "…" : "·";
        return (
          <li key={key} className={cls} style={{ display: "flex", gap: 10, fontSize: 14.5, color: "var(--ink-faint)", padding: "2px 0" }}>
            <span style={{ width: 16, display: "inline-block" }}>{mark}</span> {label}
          </li>
        );
      })}
    </ul>
  );
}

export default function SuccessPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id") ?? "";
    setSessionId(id);
    if (!id) { setError("No checkout session reference — check your order email."); return; }

    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load the order.");
        setStatus(data);
        if (data.paid && data.prodigi) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (e) {
        setError((e as Error).message);
      }
      if (tries > 40 && pollRef.current) clearInterval(pollRef.current);
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const paid = status?.paid;
  const stage = status?.prodigi?.stage;

  return (
    <div className="wrap">
      <header className="site">
        <Link className="wordmark" href="/">SKY<span style={{ color: "var(--gold)" }}>B</span>ORN</Link>
      </header>

      <div className="success-grid">
        <div>
          <div className="art-frame">
            {status?.artworkUrl
              ? <img src={status.artworkUrl} alt="Your one-of-one sky chart" />
              : <div style={{ aspectRatio: "2480/3507", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontStyle: "italic" }}>
                  {paid ? "Preparing your artwork…" : "Artwork appears after payment."}
                </div>}
          </div>
          <p style={{ color: "var(--ink-faint)", fontStyle: "italic", fontSize: 14.5 }}>
            The exact print file Prodigi received — 300 DPI, full-front DTG.
          </p>
        </div>

        <div>
          <div className="kicker" style={{ fontFamily: "var(--caps)", fontSize: 12, letterSpacing: "0.42em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 14 }}>
            Thank you — the sky is yours
          </div>
          <h1 style={{ fontFamily: "var(--caps)", fontWeight: 600, letterSpacing: "0.1em", fontSize: "clamp(26px, 4vw, 40px)", margin: "0 0 8px" }}>
            {paid ? "Payment received" : "Checking payment…"}
          </h1>
          <p style={{ color: "var(--ink-soft)" }}>
            {paid
              ? "This exact moment of sky has been claimed. It will never be printed for anyone else."
              : "Give it a moment — the payment confirmation travels from Stripe to us, usually within seconds."}
          </p>

          <ul className="statusline">
            <li className={paid ? "done" : "pend"}>
              <span className="dot">{paid ? "✓" : "…"}</span>
              <div>
                {paid ? "Payment confirmed" : "Awaiting payment confirmation"}
                <span className="sub">
                  {status?.amountTotal ? `$${(status.amountTotal / 100).toFixed(2)} ${status.currency?.toUpperCase()} — ` : ""}
                  {status?.email ? `receipt sent to ${status.email}` : sessionId ? <span className="mono">{sessionId.slice(0, 30)}…</span> : ""}
                </span>
              </div>
            </li>
            <li className={stage ? "done" : "pend"}>
              <span className="dot">{stage ? "✓" : "…"}</span>
              <div>
                {stage ? "Sent to production — order accepted" : "Sending to the print network…"}
                <span className="sub">
                  {stage
                    ? STAGE_COPY[stage] ?? `Stage: ${stage}`
                    : "Your artwork is regenerated at full print resolution and submitted to Prodigi."}
                  {status?.prodigi?.orderId && <> · <span className="mono">{status.prodigi.orderId}</span></>}
                </span>
                {status?.prodigi?.details && <DetailDots details={status.prodigi.details} />}
                {status?.prodigi?.issues && status.prodigi.issues.length > 0 && (
                  <span className="sub" style={{ color: "var(--err)" }}>
                    Issues: {status.prodigi.issues.join("; ")} — contact support.
                  </span>
                )}
              </div>
            </li>
            <li className="pend">
              <span className="dot">·</span>
              <div>
                Printed &amp; shipped
                <span className="sub">
                  {status?.prodigi?.shipments?.some(s => s.trackingUrl)
                    ? status.prodigi.shipments.filter(s => s.trackingUrl).map(s => (
                        <a key={s.trackingUrl} href={s.trackingUrl} style={{ color: "var(--gold)" }}>Track your package</a>
                      ))
                    : "Standard US shipping · typically 4–8 business days · tracking appears here once the lab dispatches it."}
                </span>
              </div>
            </li>
          </ul>

          {error && <p className="formerr">{error}</p>}

          <p style={{ marginTop: 26 }}>
            <Link href="/" style={{ color: "var(--gold)", fontStyle: "italic" }}>
              ← Chart another sky
            </Link>
          </p>
          <p style={{ color: "var(--ink-faint)", fontSize: 13 }}>
            Skyborn — one sky, one shirt. Payments by Stripe; printing &amp; shipping by Prodigi.
          </p>
        </div>
      </div>
    </div>
  );
}
