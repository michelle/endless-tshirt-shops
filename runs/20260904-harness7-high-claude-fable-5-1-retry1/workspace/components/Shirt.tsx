"use client";

import { useEffect, useRef } from "react";
import { LAYOUT } from "@/lib/layout";
import { STYLES, formatUtc, type StyleId } from "@/lib/products";

/** Tee silhouettes from the original datetime.store (viewBox 0 0 100 125). */
const PATHS: Record<StyleId, string> = {
  fitted:
    "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721 s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875 c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117 C92.185,29.288,80.945,16.781,79.312,15.149z",
  unisex:
    "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724 C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06 l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z",
};

/**
 * Where the front print area sits on each silhouette, in viewBox units (x = horizontal centre, y = top).
 * Width ≈ the 15.6in print area on a ~20in-wide chest; the layout inside it
 * mirrors lib/artwork so the on-screen shirt is what gets printed.
 */
const PRINT_AREA: Record<StyleId, { x: number; y: number; w: number }> = {
  fitted: { x: 50, y: 26, w: 36 },
  unisex: { x: 50, y: 24, w: 36 },
};

export interface ShirtProps {
  style: StyleId;
  /** When set, the shirt stops ticking and shows this exact millisecond. */
  frozenAt: number | null;
  /** Show the price badge (shop view) */
  showPrice?: boolean;
  price?: string;
  compareAt?: string;
}

export default function Shirt({ style, frozenAt, showPrice, price, compareAt }: ShirtProps) {
  const epochRef = useRef<SVGTextElement>(null);
  const utcRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    if (frozenAt !== null) {
      if (epochRef.current) epochRef.current.textContent = String(frozenAt);
      if (utcRef.current) utcRef.current.textContent = formatUtc(frozenAt);
      return;
    }
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      if (epochRef.current) epochRef.current.textContent = String(now);
      if (utcRef.current) utcRef.current.textContent = formatUtc(now);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [frozenAt]);

  const area = PRINT_AREA[style];
  const ratio = STYLES[style].printArea.height / STYLES[style].printArea.width;
  const areaH = area.w * ratio;
  const epochSize = area.w * LAYOUT.epochFontSize;
  const epochWidth = area.w * LAYOUT.epochWidth;
  const utcSize = area.w * LAYOUT.utcFontSize;
  const epochY = area.y + areaH * LAYOUT.epochTop + epochSize; // baseline
  const utcY = epochY + area.w * LAYOUT.utcGap + utcSize;
  const initial = frozenAt ?? 0;

  return (
    <div className={`Shirt${frozenAt !== null ? " is-frozen" : ""}`}>
      <svg viewBox="6 2 88 102" role="img" aria-label={`Black ${STYLES[style].label.toLowerCase()} t-shirt printed with the current datetime`}>
        <path className="Shirt-body" fillRule="evenodd" clipRule="evenodd" d={PATHS[style]} />
        <text
          ref={epochRef}
          className="Shirt-print Shirt-print-epoch"
          x={area.x}
          y={epochY}
          textAnchor="middle"
          fontSize={epochSize}
          fontWeight={700}
          textLength={epochWidth}
          lengthAdjust="spacingAndGlyphs"
          suppressHydrationWarning
        >
          {initial ? String(initial) : " "}
        </text>
        <text
          ref={utcRef}
          className="Shirt-print Shirt-print-utc"
          x={area.x}
          y={utcY}
          textAnchor="middle"
          fontSize={utcSize}
          fontWeight={400}
          letterSpacing={utcSize * 0.15}
          suppressHydrationWarning
        >
          {initial ? formatUtc(initial) : " "}
        </text>
      </svg>
      {showPrice ? (
        <div className="Shirt-price">
          <span className="label">
            {compareAt ? <s>{compareAt}</s> : null}
            {price}
          </span>
          <small>free shipping</small>
        </div>
      ) : null}
    </div>
  );
}
