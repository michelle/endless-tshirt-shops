"use client";

import { useEffect, useRef } from "react";
import { COMPARE_AT_CENTS, formatPrice, PRICE_CENTS, type ShirtStyle } from "@/lib/products";

interface ShirtProps {
  style: ShirtStyle;
  /** When set, the shirt stops ticking and shows this timestamp. */
  frozenAt: number | null;
}

const FITTED_PATH =
  "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721 s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875 c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117 C92.185,29.288,80.945,16.781,79.312,15.149z";
const UNISEX_PATH =
  "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724 C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06 l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z";

/**
 * The product. A black tee with the current Unix time in milliseconds printed
 * across the chest, ticking live until the moment you buy it.
 */
export default function Shirt({ style, frozenAt }: ShirtProps) {
  const textRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    if (frozenAt !== null) {
      el.textContent = String(frozenAt);
      return;
    }
    let raf = 0;
    const tick = () => {
      el.textContent = String(Date.now());
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [frozenAt]);

  return (
    <div>
      <div className="Shirt" aria-live="off">
        <svg className="Shirt-svg" viewBox="0 0 100 125" role="img" aria-label={`Black ${style} t-shirt printed with the current time in milliseconds`}>
          <path fillRule="evenodd" clipRule="evenodd" fill="#000" d={style === "fitted" ? FITTED_PATH : UNISEX_PATH} />
          <text ref={textRef} className="Shirt-time" x="50.5" y="30" textAnchor="middle" fontSize="3.7" suppressHydrationWarning>
            {frozenAt ?? ""}
          </text>
        </svg>
        <div className="Shirt-price">
          <h2 style={{ margin: 0 }}>
            <span className="label">
              <s>{formatPrice(COMPARE_AT_CENTS)}</s>
              {formatPrice(PRICE_CENTS)}
            </span>
          </h2>
        </div>
      </div>
      <p className="Shirt-caption">
        {frozenAt === null ? (
          <>
            That number is the <strong>current Unix time in milliseconds</strong>. It stops the instant you buy, and that exact moment is what gets printed on your shirt. Free shipping.
          </>
        ) : (
          <>
            Frozen at <code>{frozenAt}</code> — {new Date(frozenAt).toLocaleString()}. That is your shirt.
          </>
        )}
      </p>
    </div>
  );
}
