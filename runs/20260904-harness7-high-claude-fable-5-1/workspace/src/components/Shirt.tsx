"use client";

import { useEffect, useRef } from "react";
import { LIST_PRICE_CENTS, PRICE_CENTS, formatMoney, type StyleId } from "@/lib/catalog";

/** Shirt silhouettes from the original datetime.store (viewBox 0 0 100 125). */
const PATHS: Record<StyleId, string> = {
  fitted:
    "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721 s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875 c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117 C92.185,29.288,80.945,16.781,79.312,15.149z",
  unisex:
    "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724 C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06 l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z",
};

/** Where the print lands on the preview, mirroring the 8in-wide / 3in-down print placement. */
const PRINT = { x: 50, y: 35, width: 23, fontSize: 3 };

export function formatHuman(ts: number): string {
  const d = new Date(ts);
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(d);
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  // "18:42:11 PDT" -> "18:42:11.123 PDT"
  const withMs = time.replace(/(\d{2}:\d{2}:\d{2})/, `$1.${ms}`);
  return `${date}, ${withMs}`;
}

interface ShirtProps {
  style: StyleId;
  /** When set, the shirt stops ticking and shows exactly this timestamp. */
  frozenAt: number | null;
}

export default function Shirt({ style, frozenAt }: ShirtProps) {
  const textRef = useRef<SVGTextElement>(null);
  const captionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const paint = (ts: number) => {
      if (textRef.current) textRef.current.textContent = String(ts);
      if (captionRef.current) captionRef.current.textContent = formatHuman(ts);
    };
    if (frozenAt !== null) {
      paint(frozenAt);
      return;
    }
    let raf = 0;
    const tick = () => {
      paint(Date.now());
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [frozenAt]);

  const frozen = frozenAt !== null;
  return (
    <div className={`shirt${frozen ? " is-frozen" : ""}`}>
      <svg
        className="shirt-svg"
        viewBox="0 0 100 106"
        role="img"
        aria-label={frozen ? `Black ${style} t-shirt printed with ${frozenAt}` : `Black ${style} t-shirt printed with the current time`}
      >
        <path className="shirt-body" fillRule="evenodd" clipRule="evenodd" d={PATHS[style]} />
        <text
          ref={textRef}
          className="shirt-time"
          x={PRINT.x}
          y={PRINT.y}
          textAnchor="middle"
          fontSize={PRINT.fontSize}
          textLength={PRINT.width}
          lengthAdjust="spacingAndGlyphs"
          aria-hidden="true"
        >
          {frozenAt ?? ""}
        </text>
      </svg>
      <div className="shirt-price">
        <span className="badge">
          <s>{formatMoney(LIST_PRICE_CENTS)}</s>
          {formatMoney(PRICE_CENTS)}
        </span>
        <span className="badge-note">free shipping</span>
      </div>
      <p className="shirt-caption">
        {frozen ? "your moment: " : "right now: "}
        <strong ref={captionRef}>{frozenAt ? formatHuman(frozenAt) : ""}</strong>
      </p>
    </div>
  );
}
