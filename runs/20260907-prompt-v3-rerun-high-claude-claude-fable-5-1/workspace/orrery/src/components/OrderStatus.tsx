"use client";
import { useEffect, useState } from "react";
import type { OrderView } from "@/lib/fulfil";

const STEPS: Array<[string, string]> = [
  ["downloadAssets", "Artwork received"],
  ["printReadyAssetsPrepared", "Print file prepared"],
  ["allocateProductionLocation", "Assigned to print facility"],
  ["inProduction", "Printing"],
  ["shipping", "Shipped"],
];

export default function OrderStatus({ initial }: { initial: OrderView }) {
  const [view, setView] = useState(initial);
  const done = view.fulfilment?.stage === "Complete" || view.fulfilment?.stage === "Cancelled";

  useEffect(() => {
    if (!view.paid || done) return;
    let n = 0;
    const t = setInterval(async () => {
      n += 1;
      if (n > 30) { clearInterval(t); return; }
      try {
        const r = await fetch(`/api/orders/${view.sessionId}`, { cache: "no-store" });
        if (r.ok) setView(await r.json());
      } catch { /* keep last state */ }
    }, 5000);
    return () => clearInterval(t);
  }, [view.sessionId, view.paid, done]);

  if (!view.paid) {
    return <p className="text-sm text-mute">Payment hasn&apos;t completed for this session. If you closed checkout early, go back and try again.</p>;
  }
  const f = view.fulfilment;
  return (
    <div className="space-y-4">
      {!f && (
        <div className="rounded-xl border border-line bg-dusk/60 p-4 text-sm">
          <div className="mono text-sun">Sending to the printer…</div>
          <p className="mt-1 text-mute">Payment confirmed. We&apos;re handing your artwork to the print facility now. This page updates automatically.</p>
          {view.fulfilmentError && <p className="mt-2 text-xs text-red-400">Last attempt: {view.fulfilmentError}. We keep retrying automatically.</p>}
        </div>
      )}
      {f && (
        <div className="rounded-xl border border-line bg-dusk/60 p-4 text-sm">
          <div className="flex items-center justify-between">
            <div className="mono text-sun">{f.stage === "Complete" ? "Shipped" : f.stage === "Cancelled" ? "Cancelled" : "In production"}</div>
            <div className="mono text-xs text-mute">Print order {f.prodigiOrderId}</div>
          </div>
          <ol className="mt-3 space-y-1.5">
            {STEPS.map(([k, label]) => {
              const st = f.details[k] ?? "NotStarted";
              const ok = st === "Complete";
              const busy = st === "InProgress";
              return (
                <li key={k} className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-sky" : busy ? "bg-sun" : "bg-line"}`} />
                  <span className={ok ? "" : "text-mute"}>{label}</span>
                  {busy && <span className="mono text-[10px] uppercase tracking-widest text-sun">now</span>}
                </li>
              );
            })}
          </ol>
          {f.shipments.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              {f.shipments.map((s, i) => (
                <div key={i} className="text-mute">
                  {s.carrier ?? "Carrier"} {s.service ? `· ${s.service}` : ""} {s.trackingNumber && (s.trackingUrl ? <a className="text-sky underline" href={s.trackingUrl}>{s.trackingNumber}</a> : s.trackingNumber)}
                </div>
              ))}
            </div>
          )}
          {f.issues.length > 0 && <p className="mt-2 text-xs text-red-400">Printer flagged: {f.issues.join("; ")}</p>}
        </div>
      )}
    </div>
  );
}
