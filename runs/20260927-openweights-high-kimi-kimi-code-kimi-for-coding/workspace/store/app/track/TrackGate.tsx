"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface StatusInfo {
  found: boolean;
  prodigiId?: string;
  stage?: string;
  details?: Record<string, string>;
  issues?: { errorCode?: string; description?: string }[];
  shipments?: { carrier: string | null; service: string | null; tracking: any; status: string | null }[];
  created?: string;
  lastUpdated?: string;
  shippingMethod?: string;
}

const STAGE_LABELS: [string, string][] = [
  ["downloadAssets", "Artwork downloaded"],
  ["printReadyAssetsPrepared", "Print file prepared"],
  ["allocateProductionLocation", "Print lab allocated"],
  ["inProduction", "In production"],
  ["shipping", "Shipping"],
];

export default function TrackGate() {
  const params = useSearchParams();
  const initialRef = params.get("ref") ?? "";
  const [ref, setRef] = useState(initialRef);
  const [info, setInfo] = useState<StatusInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function lookup(r: string) {
    if (!r) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/order-status?ref=${encodeURIComponent(r)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setInfo(data);
    } catch (e) {
      setErr((e as Error).message);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialRef) lookup(initialRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRef]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="text-center font-serif text-4xl tracking-tight">
        Track an order
      </h1>
      <p className="mx-auto mt-3 max-w-md text-center text-sm text-[#1d1a15]/70">
        Paste your order reference (it starts with{" "}
        <code className="rounded bg-[#1d1a15]/10 px-1">cs_</code> and is shown on
        your confirmation page and Stripe receipt).
      </p>

      <form
        className="mx-auto mt-6 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(ref.trim());
        }}
      >
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="cs_test_..."
          className="w-full rounded-lg border border-[#1d1a15]/25 bg-white px-4 py-3 font-mono text-sm"
        />
        <button
          type="submit"
          disabled={loading || !ref.trim()}
          className="shrink-0 rounded-lg bg-[#1d1a15] px-5 font-semibold text-[#f2ead8] disabled:opacity-40"
        >
          {loading ? "..." : "Track"}
        </button>
      </form>

      {err && <p className="mt-4 text-center text-sm text-red-700">{err}</p>}

      {info && !info.found && (
        <p className="mt-8 rounded-xl border border-[#b8862d]/40 bg-[#b8862d]/10 p-5 text-center text-sm">
          No production order found yet for this reference. If you just paid, it
          can take a minute or two for the order to reach the print queue.
        </p>
      )}

      {info?.found && (
        <div className="mt-8 rounded-2xl border border-[#1d1a15]/15 bg-white p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">{info.stage ?? "Unknown"}</h2>
            <span className="text-xs text-[#1d1a15]/50">{info.prodigiId}</span>
          </div>
          <p className="mt-1 text-xs text-[#1d1a15]/50">
            Shipping method: {info.shippingMethod ?? "-"} - placed{" "}
            {info.created ? new Date(info.created).toLocaleString() : "-"}
          </p>

          <ol className="mt-6 space-y-3">
            {STAGE_LABELS.map(([key, label]) => {
              const state = info.details?.[key] ?? "NotStarted";
              const done = state === "Completed";
              const active = state === "InProgress";
              return (
                <li key={key} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${
                      done
                        ? "border-[#1e7a45] bg-[#1e7a45] text-white"
                        : active
                          ? "border-[#b8862d] bg-[#b8862d] text-white"
                          : "border-[#1d1a15]/25 text-[#1d1a15]/40"
                    }`}
                  >
                    {done ? "OK" : active ? "..." : ""}
                  </span>
                  <span className={done || active ? "" : "text-[#1d1a15]/45"}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>

          {(info.shipments ?? []).length > 0 && (
            <div className="mt-6 border-t border-[#1d1a15]/10 pt-4 text-sm">
              {info.shipments!.map((s, i) => (
                <div key={i} className="flex justify-between gap-4 py-1">
                  <span className="text-[#1d1a15]/60">
                    {s.carrier ?? "carrier"} {s.service ?? ""}
                  </span>
                  <span>
                    {s.tracking?.number ? (
                      <span className="font-mono text-xs">{s.tracking.number}</span>
                    ) : (
                      (s.status ?? "")
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {(info.issues ?? []).length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">
              {info.issues!.map((i, n) => (
                <p key={n}>
                  {i.errorCode}: {i.description}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
