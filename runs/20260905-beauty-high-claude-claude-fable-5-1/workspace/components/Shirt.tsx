"use client";

import { useEffect, useRef } from "react";
import { COLOR_INFO, type Color, type Style } from "@/lib/catalog";

interface Props {
  style: Style;
  color: Color;
  /** When set, the digits stop here. */
  frozenTs: number | null;
}

const PATHS: Record<Style, string> = {
  unisex:
    "M148 36 C160 74 240 74 252 36 L338 62 L392 152 L322 190 L308 166 L308 404 Q200 424 92 404 L92 166 L78 190 L8 152 L62 62 Z",
  fitted:
    "M152 40 C165 82 235 82 248 40 L326 64 L370 146 L312 180 L300 160 C300 220 290 300 300 402 Q200 418 100 402 C110 300 100 220 100 160 L88 180 L30 146 L74 64 Z",
};

const COLLARS: Record<Style, string> = {
  unisex: "M148 36 C160 74 240 74 252 36",
  fitted: "M152 40 C165 82 235 82 248 40",
};

/**
 * The shirt. A clock you can wear. Digits update every animation frame
 * straight into the DOM so React never re-renders for a tick.
 */
export default function Shirt({ style, color, frozenTs }: Props) {
  const digitsRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = digitsRef.current;
    if (!el) return;
    if (frozenTs !== null) {
      el.textContent = String(frozenTs);
      return;
    }
    let raf = 0;
    const tick = () => {
      el.textContent = String(Date.now());
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [frozenTs]);

  // A gentle 3D tilt that follows the pointer. Purely decorative.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || frozenTs !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      if (Math.abs(x) > 1.2 || Math.abs(y) > 1.2) {
        wrap.style.transform = "";
        return;
      }
      wrap.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`;
    };
    const reset = () => (wrap.style.transform = "");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", reset);
      reset();
    };
  }, [frozenTs]);

  const fill = COLOR_INFO[color].hex;
  const ink = COLOR_INFO[color].ink === "white" ? "#f7f4ee" : "#101014";
  const seam = color === "black" ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)";

  return (
    <div ref={wrapRef} className={`shirt-wrap${frozenTs !== null ? " frozen" : ""}`}>
      <svg className="shirt-svg" viewBox="0 0 400 440" role="img" aria-label={`A ${COLOR_INFO[color].label.toLowerCase()} ${style} t-shirt printed with the current time in milliseconds`}>
        <defs>
          <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={color === "black" ? 0.08 : 0.5} />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity={color === "black" ? 0.25 : 0.08} />
          </linearGradient>
        </defs>
        <path className="shirt-body" d={PATHS[style]} fill={fill} stroke={seam} strokeWidth="1.5" strokeLinejoin="round" />
        <path d={PATHS[style]} fill="url(#sheen)" />
        <path d={COLLARS[style]} fill="none" stroke={seam} strokeWidth="6" strokeLinecap="round" />
        {style === "unisex" ? (
          <>
            <path d="M308 166 L322 190" stroke={seam} strokeWidth="1.5" />
            <path d="M92 166 L78 190" stroke={seam} strokeWidth="1.5" />
          </>
        ) : (
          <>
            <path d="M300 160 L312 180" stroke={seam} strokeWidth="1.5" />
            <path d="M100 160 L88 180" stroke={seam} strokeWidth="1.5" />
          </>
        )}
      </svg>
      <div ref={digitsRef} className="shirt-digits" style={{ color: ink }} aria-live="off">
        {frozenTs ?? ""}
      </div>
    </div>
  );
}
