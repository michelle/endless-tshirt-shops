"use client";

import { useEffect, useState } from "react";
import Shirt from "@/components/Shirt";
import { formatStampForHumans, isColor, type ColorId } from "@/lib/product";

interface SessionInfo {
  email: string | null;
  stampMs: number | null;
  color: string | null;
  size: string | null;
  amountTotal: number | null;
}

export default function SuccessPage() {
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id");
    if (!id) {
      setError("Missing session.");
      return;
    }
    fetch(`/api/session/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load order.");
        return data;
      })
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, []);

  const color: ColorId = isColor(info?.color) ? info!.color : "black";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="font-display text-lg font-bold tracking-tight">
        datetime<span className="text-stamp">.</span>store
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} If you were just charged, check your email — the order may
          still be processing.
        </div>
      )}

      {!error && !info && (
        <p className="text-ink/50">Confirming your moment…</p>
      )}

      {info && (
        <>
          <h1 className="font-display text-3xl font-bold">
            Congrats on your pretty cool shirt.
          </h1>
          <p className="max-w-md text-ink/60">
            You will never get this millisecond back, but you will get it in
            the mail, screen-printed on a shirt, in{" "}
            {info.size?.toUpperCase()}.
            {info.email ? ` A receipt is headed to ${info.email}.` : ""}
          </p>

          <Shirt color={color} frozenStampMs={info.stampMs ?? undefined} />

          {info.stampMs != null && (
            <p className="font-mono text-sm text-ink/50">
              {formatStampForHumans(info.stampMs)}
            </p>
          )}

          <a
            href="/"
            className="mt-4 rounded-lg border border-ink/20 px-5 py-2.5 text-sm font-semibold hover:border-ink/50"
          >
            Buy another moment
          </a>
        </>
      )}
    </main>
  );
}
