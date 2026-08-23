"use client";

import { useEffect, type RefObject } from "react";
import type { ShirtStyle } from "@/lib/products";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 220;

const SHIRT_PATHS: Record<ShirtStyle, string> = {
  unisex:
    "M90,20 L120,0 L150,15 L180,0 L210,20 L270,70 L230,112 L210,92 L210,290 L90,290 L90,92 L70,112 L30,70 Z",
  fitted:
    "M95,20 L120,0 L150,15 L180,0 L205,20 L265,70 L225,112 L205,92 L205,150 Q222,192 205,232 L205,290 L95,290 L95,232 Q78,192 95,150 L95,92 L75,112 L35,70 Z",
};

/** Draws the live, ticking current-moment artwork onto the canvas every frame. */
function drawFrame(ctx: CanvasRenderingContext2D, dpr: number) {
  const w = CANVAS_WIDTH;
  const h = CANVAS_HEIGHT;
  ctx.clearRect(0, 0, w * dpr, h * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  const now = new Date();
  const dateStr = now
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  const mono = 'ui-monospace, "SF Mono", "Space Mono", Menlo, Consolas, monospace';

  ctx.textAlign = "center";
  ctx.fillStyle = "#f5f5f0";

  ctx.font = `600 15px ${mono}`;
  ctx.letterSpacing = "3px";
  ctx.fillText(dateStr, w / 2, h * 0.28);

  ctx.font = `700 46px ${mono}`;
  ctx.letterSpacing = "1px";
  ctx.fillText(`${timeStr}.${ms}`, w / 2, h * 0.56);

  ctx.font = `500 12px ${mono}`;
  ctx.letterSpacing = "1px";
  ctx.fillStyle = "#a3a39c";
  ctx.fillText(`${now.getTime()} MS SINCE EPOCH`, w / 2, h * 0.74);

  ctx.restore();
}

export function ShirtVisual({
  shirtStyle,
  canvasRef,
  frozen,
}: {
  shirtStyle: ShirtStyle;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  frozen: boolean;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const tick = () => {
      if (!frozen) drawFrame(ctx, dpr);
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [canvasRef, frozen]);

  return (
    <div className="relative mx-auto aspect-[10/11] w-full max-w-sm select-none">
      <svg
        viewBox="0 0 300 300"
        className="absolute inset-0 h-full w-full drop-shadow-xl"
        aria-hidden="true"
      >
        <path d={SHIRT_PATHS[shirtStyle]} fill="#161616" stroke="#000" strokeWidth="1" />
      </svg>
      <div className="absolute left-[16%] top-[34%] w-[68%]">
        <canvas
          ref={canvasRef}
          style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
          className="pointer-events-none w-full"
          aria-hidden="true"
        />
      </div>
      <span className="sr-only" role="status" aria-live="off">
        A t-shirt printed with the exact moment you buy it.
      </span>
    </div>
  );
}
