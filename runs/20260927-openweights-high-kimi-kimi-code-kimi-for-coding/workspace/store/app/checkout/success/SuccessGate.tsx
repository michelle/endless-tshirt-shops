"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DesignInput } from "@/lib/design";
import { buildMockupSvg } from "@/lib/artwork-svg";

interface SessionInfo {
  paymentStatus: string;
  email: string | null;
  amountTotal: number | null;
  currency: string;
  metadata: {
    word: string;
    pos: string;
    definition: string;
    example: string;
    year: string;
    size: string;
    colorLabel: string;
    accent: string;
  };
}

const COLOR_BY_LABEL: Record<string, string> = {
  Black: "black",
  White: "white",
  Navy: "navy",
  "Athletic Heather": "heather",
  Ash: "ash",
  Cream: "cream",
  Maroon: "maroon",
  Burgundy: "burgundy",
  "Kelly Green": "kelly",
  "Royal Blue": "royal",
  Pink: "pink",
  Natural: "natural",
};

export default function SuccessGate() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/session?id=${encodeURIComponent(sessionId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load this order");
        return r.json();
      })
      .then(setInfo)
      .catch((e) => setErr(e.message));
  }, [sessionId]);

  const design: DesignInput | null = useMemo(() => {
    if (!info) return null;
    const m = info.metadata;
    return {
      word: m.word,
      pos: m.pos,
      definition: m.definition,
      example: m.example,
      year: m.year ? Number(m.year) : null,
      size: (m.size as DesignInput["size"]) || "m",
      color: COLOR_BY_LABEL[m.colorLabel] ?? "black",
      accent: m.accent || "gold",
    };
  }, [info]);

  const mockup = useMemo(() => (design ? buildMockupSvg(design) : ""), [design]);

  if (err) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-serif text-3xl">Hmm.</h1>
        <p className="mt-3 text-[#1d1a15]/70">{err}</p>
        <Link href="/" className="mt-6 inline-block underline underline-offset-4">
          Back to the store
        </Link>
      </div>
    );
  }
  if (!info || !design) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center text-[#1d1a15]/60">
        Loading your order...
      </div>
    );
  }

  const paid = info.paymentStatus === "paid";

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b8862d]">
          {paid ? "Payment confirmed" : "Payment pending"}
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
          {paid ? `${design.word}, officially defined.` : "Almost there."}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[#1d1a15]/70">
          {paid
            ? `Your shirt is heading into DTG production now. A receipt is on its way to ${info.email ?? "your email"}.`
            : "We're still confirming your payment."}
        </p>
      </div>

      <div className="mt-10 grid items-start gap-8 sm:grid-cols-2">
        <div
          className="rounded-2xl border border-[#1d1a15]/10 bg-white p-6"
          dangerouslySetInnerHTML={{ __html: mockup }}
        />
        <div className="space-y-4">
          <dl className="rounded-xl bg-[#1d1a15] p-5 text-[#f2ead8]">
            <dt className="font-serif text-2xl">
              {design.word}
              <span className="text-[#f2ead8]/60">, {design.pos}.</span>
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-[#f2ead8]/85">
              {design.definition}
            </dd>
            <dd className="mt-2 font-serif italic text-[#f2ead8]/70">
              {design.example}
            </dd>
          </dl>
          <div className="rounded-xl border border-[#1d1a15]/15 bg-white p-5 text-sm">
            <Row k="Size" v={design.size.toUpperCase()} />
            <Row k="Colour" v={info.metadata.colorLabel} />
            <Row
              k="Total paid"
              v={
                info.amountTotal
                  ? `${(info.amountTotal / 100).toFixed(2)} ${info.currency.toUpperCase()}`
                  : "-"
              }
            />
            <Row k="Order reference" v={sessionId ?? "-"} mono />
          </div>
          <Link
            href={`/track?ref=${encodeURIComponent(sessionId ?? "")}`}
            className="block rounded-lg border border-[#1d1a15]/25 py-3 text-center font-semibold hover:bg-[#1d1a15]/5"
          >
            Track production &amp; shipping
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#1d1a15]/10 py-2 last:border-0">
      <span className="text-[#1d1a15]/60">{k}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium"}>{v}</span>
    </div>
  );
}
