"use client";

import { useEffect, useRef, useState } from "react";
import type { ColorwayId, FitId } from "@/lib/catalog";
import { COLORWAYS } from "@/lib/catalog";
import type { DialectId } from "@/lib/dialects";
import { PrintArt } from "./PrintArt";
import { PrintImage, ShirtBody } from "./ShirtBody";

export function Shirt({
  fit,
  colorway,
  dialect,
  timeZone,
  frozenMs,
  printUrl,
}: {
  fit: FitId;
  colorway: ColorwayId;
  dialect: DialectId;
  timeZone: string;
  frozenMs: number | null;
  /** Once frozen, the real print file replaces the live preview. */
  printUrl: string | null;
}) {
  const tilt = useTilt();
  const [printReady, setPrintReady] = useState(false);

  useEffect(() => setPrintReady(false), [printUrl]);

  return (
    <div ref={tilt.ref} className="relative w-full select-none" style={{ perspective: "1400px" }}>
      <div
        className="sway relative"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 380ms cubic-bezier(0.16,1,0.3,1)",
          transformStyle: "preserve-3d",
        }}
      >
        <ShirtBody fit={fit} colorway={colorway}>
          {printUrl && printReady ? null : (
            <PrintArt
              dialect={dialect}
              timeZone={timeZone}
              frozenMs={frozenMs}
              ink={COLORWAYS[colorway].ink}
            />
          )}
          {printUrl && (
            <PrintImage src={printUrl} hidden={!printReady} onLoad={() => setPrintReady(true)} />
          )}
        </ShirtBody>
      </div>
    </div>
  );
}

/** A little parallax so the shirt feels like an object rather than a diagram. */
function useTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      setT({ x: Math.max(-6, Math.min(6, -dy * 9)), y: Math.max(-9, Math.min(9, dx * 12)) });
    };
    const leave = () => setT({ x: 0, y: 0 });

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", leave);
    };
  }, []);

  return { ref, ...t };
}
