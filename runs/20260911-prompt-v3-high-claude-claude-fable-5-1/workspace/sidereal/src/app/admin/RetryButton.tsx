"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryButton({ id, token }: { id: string; token: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  async function retry() {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/fulfill", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    const j = await r.json();
    setMsg(r.ok ? "ok" : j.error ?? "failed");
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={retry} disabled={busy} className="mt-1 rounded border border-line px-2 py-1 text-[11px] hover:border-mist disabled:opacity-50">
      {busy ? "…" : "retry fulfilment"} {msg && `(${msg})`}
    </button>
  );
}
