"use client";

import { useEffect, useState } from "react";
import type { OrderRecord } from "@/lib/orders";

interface ProdigiStatus {
  stage?: string;
  details?: Record<string, string>;
  issues?: { description: string }[];
  shipments?: { carrier?: { name?: string }; tracking?: { number?: string; url?: string }; dispatchDate?: string }[];
  error?: string;
}

type Safe = Omit<OrderRecord, "email" | "customerName">;

export function OrderStatus({ id, initial }: { id: string; initial: Safe }) {
  const [order, setOrder] = useState<Safe>(initial);
  const [prodigi, setProdigi] = useState<ProdigiStatus | null>(null);

  useEffect(() => {
    let stop = false;
    let ticks = 0;
    async function poll() {
      try {
        const r = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        if (r.ok) {
          const j = (await r.json()) as { order: Safe; prodigi: ProdigiStatus | null };
          if (!stop) {
            setOrder(j.order);
            setProdigi(j.prodigi);
          }
        }
      } catch {
        /* ignore */
      }
      ticks++;
      if (!stop && ticks < 24) setTimeout(poll, 5000);
    }
    poll();
    return () => {
      stop = true;
    };
  }, [id]);

  const steps: { label: string; done: boolean; detail?: string }[] = [
    { label: "Payment received", done: true },
    { label: "Print file rendered", done: Boolean(order.printUrl) },
    { label: "Sent to the print facility", done: order.status === "submitted", detail: order.prodigiOrderId },
    {
      label: "Print file accepted by the facility",
      done: prodigi?.details?.printReadyAssetsPrepared === "Complete",
      detail: prodigi?.details?.downloadAssets === "Complete" ? "downloaded" : undefined,
    },
    {
      label: "In production",
      done: prodigi?.details?.inProduction === "Complete",
      detail: prodigi?.details?.inProduction === "InProgress" ? "printing now" : undefined,
    },
    {
      label: "Shipped",
      done: prodigi?.details?.shipping === "Complete",
      detail: prodigi?.shipments?.[0]?.tracking?.number,
    },
  ];

  return (
    <div className="mt-6 rounded-lg border border-line bg-panel p-5">
      <ol className="space-y-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-start gap-3 text-sm">
            <span
              className={`mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
                s.done ? "border-gold bg-gold text-night" : "border-line"
              }`}
            >
              {s.done && <span className="text-[10px]">✓</span>}
            </span>
            <span className={s.done ? "text-fog" : "text-mist"}>
              {s.label}
              {s.detail && <span className="ml-2 font-mono text-[11px] text-mist">{s.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
      {order.status === "failed" && (
        <p className="mt-4 text-xs text-red-400">
          We hit a problem sending this to the printer: {order.error}. Your payment is safe; we&apos;ll retry and email you.
        </p>
      )}
      {prodigi?.issues && prodigi.issues.length > 0 && (
        <p className="mt-4 text-xs text-amber-400">Printer flagged: {prodigi.issues.map((i) => i.description).join("; ")}</p>
      )}
      {prodigi?.stage && <p className="mt-3 font-mono text-[11px] text-mist">Printer status: {prodigi.stage}</p>}
    </div>
  );
}
