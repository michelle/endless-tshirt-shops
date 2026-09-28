"use client";

import { useEffect, useState } from "react";

export function Poller({ sessionId }: { sessionId: string }) {
  const [stage, setStage] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string> | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function tick() {
      try {
        const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`);
        const json = await res.json();
        if (cancelled) return;
        setStage(json.stage || null);
        setDetails(json.details || null);
        setOrderId(json.orderId || null);
        setErr(null);
        if (json.stage === "pending" || !json.stage) {
          timer = setTimeout(tick, 4000);
        }
      } catch (e) {
        if (!cancelled) {
          setErr((e as Error).message);
          timer = setTimeout(tick, 8000);
        }
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  if (err) {
    return <div className="banner warn" style={{ marginTop: 18 }}>Status poll failed: {err}</div>;
  }
  if (!stage) {
    return <div className="banner info" style={{ marginTop: 18 }}>Waiting for Prodigi to start processing…</div>;
  }

  const stageClass = stage === "Complete" || stage === "complete" ? "ok" : "";

  return (
    <div className="banner info" style={{ marginTop: 18 }}>
      <div className="status-line">
        Status: <span className={stageClass}>{stage}</span>
      </div>
      {orderId && (
        <div className="status-line" style={{ marginTop: 6 }}>
          Order: <span style={{ fontFamily: "'Courier New', monospace" }}>{orderId}</span>
        </div>
      )}
      {details && Object.keys(details).length > 0 && (
        <div className="status-line" style={{ marginTop: 6 }}>
          {Object.entries(details).map(([k, v]) => `${k}: ${v}`).join("  ·  ")}
        </div>
      )}
    </div>
  );
}
