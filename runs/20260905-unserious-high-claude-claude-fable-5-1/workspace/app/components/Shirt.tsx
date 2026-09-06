"use client";

import { useEffect, useRef } from "react";
import type { ShirtStyle } from "@/lib/config";

// Shirt silhouettes from the original datetime.store.
const PATHS: Record<ShirtStyle, string> = {
  fitted:
    "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117C92.185,29.288,80.945,16.781,79.312,15.149z",
  unisex:
    "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z",
};

type Props = {
  style: ShirtStyle;
  /** When set, the shirt stops ticking and shows this exact millisecond. */
  frozenAt?: number | null;
  frozenNote?: string;
  children?: React.ReactNode;
};

export function Shirt({ style, frozenAt = null, frozenNote, children }: Props) {
  const timeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = timeRef.current;
    if (!el) return;
    if (frozenAt !== null) {
      el.textContent = String(frozenAt);
      return;
    }
    let raf = 0;
    const tick = () => {
      el.textContent = String(Date.now());
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [frozenAt]);

  return (
    <div className={`shirt${frozenAt !== null ? " is-frozen" : ""}`}>
      <svg viewBox="0 0 100 125" role="img" aria-label={`A black ${style} t-shirt printed with the current datetime`}>
        <path fillRule="evenodd" clipRule="evenodd" fill="#000" d={PATHS[style]} />
      </svg>
      <div className="shirt-time" ref={timeRef} suppressHydrationWarning aria-hidden="true">
        {frozenAt !== null ? String(frozenAt) : ""}
      </div>
      {frozenAt !== null && frozenNote ? <div className="shirt-frozen-note">{frozenNote}</div> : null}
      {children}
    </div>
  );
}
