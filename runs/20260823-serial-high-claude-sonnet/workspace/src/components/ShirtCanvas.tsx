"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ShirtStyle } from "@/lib/constants";

const FITTED_PATH =
  "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z";

const UNISEX_PATH =
  "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z";

// Internal drawing resolution. Kept 4:1 wide so the printed design (8in
// wide per the Scalable Press order) stays legible at DTG print quality.
const CANVAS_W = 1400;
const CANVAS_H = 350;

export type ShirtCanvasHandle = {
  /** Freezes the ticking clock and returns a PNG data URL of the current instant. */
  captureArtwork: () => string;
};

type Props = {
  style: ShirtStyle;
  /** When true, the timestamp stops ticking (order is being placed). */
  frozen: boolean;
};

const ShirtCanvas = forwardRef<ShirtCanvasHandle, Props>(function ShirtCanvas(
  { style, frozen },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    const chivo = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-chivo")
      .trim();
    ctx.font = `600 148px ${chivo || "monospace"}, monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    let frame = 0;
    const draw = () => {
      if (!frozenRef.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.fillText(String(Date.now()), canvas.width / 2, canvas.height / 2);
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  useImperativeHandle(ref, () => ({
    captureArtwork: () => canvasRef.current!.toDataURL("image/png"),
  }));

  return (
    <div className="relative mx-auto w-full max-w-sm select-none sm:max-w-md">
      <svg viewBox="0 0 100 125" className="h-auto w-full drop-shadow-xl">
        <path d={style === "fitted" ? FITTED_PATH : UNISEX_PATH} fill="#18181b" />
      </svg>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute top-[24%] left-1/2 w-[68%] -translate-x-1/2"
      />
    </div>
  );
});

export default ShirtCanvas;
