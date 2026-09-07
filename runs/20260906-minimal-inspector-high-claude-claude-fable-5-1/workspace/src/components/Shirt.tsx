"use client";

import { useEffect, useRef } from "react";
import { artworkText, INK_COLOR } from "@/lib/artwork";
import { COMPARE_AT_CENTS, formatPrice, PRICE_CENTS, STYLE_INFO, type Style } from "@/lib/products";

/** Logical canvas size; 13 digits of 37px Chivo fit comfortably. Scaled to 30% of the shirt. */
const CANVAS_W = 300;
const CANVAS_H = 48;
const FONT_PX = 37;

interface Props {
  style: Style;
  /** When set, the preview stops ticking and shows exactly this timestamp: the one being bought. */
  frozenAt: number | null;
  fontFamily: string;
}

const PATHS: Record<Style, string> = {
  fitted:
    "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721 s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875 c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117 C92.185,29.288,80.945,16.781,79.312,15.149z",
  unisex:
    "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724 C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06 l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z",
};

export function Shirt({ style, frozenAt, fontFamily }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);
    const font = `${FONT_PX}px ${fontFamily}`;
    ctx.font = font;
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.fillStyle = INK_COLOR;

    const draw = (ts: number) => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillText(artworkText(ts), CANVAS_W / 2, 4);
    };

    let raf = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      draw(Date.now());
      raf = window.requestAnimationFrame(tick);
    };

    // Make sure Chivo is actually loaded before the first paint, otherwise the
    // canvas falls back to a system font until the next frame.
    const ready = typeof document.fonts?.load === "function" ? document.fonts.load(font).catch(() => undefined) : Promise.resolve();
    ready.then(() => {
      if (cancelled) return;
      ctx.font = font;
      if (frozenAt !== null) {
        draw(frozenAt);
      } else {
        tick();
      }
    });

    return () => {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [frozenAt, fontFamily]);

  return (
    <div>
      <div className="Shirt" aria-label={`${STYLE_INFO[style].label} black t-shirt printed with the current time`}>
        <div className="Shirt-time">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} aria-hidden="true" />
        </div>
        {frozenAt !== null && <div className="Shirt-frozen">this exact moment is yours</div>}
        <svg className="Shirt-svg" viewBox="0 0 100 125" role="img" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d={PATHS[style]} />
        </svg>
        <div className="Shirt-price">
          <span className="price-label">
            <s>{formatPrice(COMPARE_AT_CENTS)}</s>
            {formatPrice(PRICE_CENTS)}
          </span>
        </div>
      </div>
      <p className="Shirt-caption">
        {STYLE_INFO[style].description}, black, printed with the Unix time in milliseconds at the moment you buy it.
      </p>
    </div>
  );
}
