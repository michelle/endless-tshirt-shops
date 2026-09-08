"use client";
import { useMemo } from "react";
import { designSvg, type Design } from "@/lib/design";
import { teeColor } from "@/lib/catalog";

/** A flat-lay tee in the chosen colour with the live design placed on the chest. */
export default function ShirtMockup({ design, flat = false }: { design: Design; flat?: boolean }) {
  const svg = useMemo(() => designSvg(design), [design]);
  const tc = teeColor(design.tee);
  const shade = tc.dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

  if (flat) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl border border-line" style={{ background: tc.hex, aspectRatio: "4677 / 5881" }}>
        <div className="absolute inset-[6%]" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ aspectRatio: "600 / 700" }}>
      <svg viewBox="0 0 600 700" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="fold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(0,0,0,0.18)" />
            <stop offset="0.25" stopColor="rgba(0,0,0,0)" />
            <stop offset="0.75" stopColor="rgba(0,0,0,0)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.18)" />
          </linearGradient>
        </defs>
        <path
          d="M215 75 C250 118 350 118 385 75 L470 105 L565 240 L470 292 L455 255 L455 650 Q300 668 145 650 L145 255 L130 292 L35 240 L130 105 Z"
          fill={tc.hex} stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinejoin="round"
        />
        <path d="M215 75 C250 118 350 118 385 75 L470 105 L565 240 L470 292 L455 255 L455 650 Q300 668 145 650 L145 255 L130 292 L35 240 L130 105 Z" fill="url(#fold)" />
        <path d="M215 75 C250 40 350 40 385 75 C350 118 250 118 215 75 Z" fill={shade} stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
        <path d="M455 255 L470 292 M145 255 L130 292" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
      </svg>
      {/* Chest print area: ~75% of body width, just below the collar */}
      <div className="absolute" style={{ left: "30.7%", top: "18.6%", width: "38.6%", aspectRatio: "4677 / 5881" }}
        dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
