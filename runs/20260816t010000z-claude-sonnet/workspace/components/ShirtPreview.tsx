"use client";

import { useEffect, useRef } from "react";
import type { ShirtStyle } from "@/lib/products";

const FITTED_PATH =
  "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z";

const UNISEX_PATH =
  "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z";

export default function ShirtPreview({
  style,
  frozen,
}: {
  style: ShirtStyle;
  frozen?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.font = "600 20px Chivo, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      const label = String(frozen ?? Date.now());
      ctx.fillText(label, w / 2, h / 2);
    };

    if (frozen != null) {
      draw();
      return;
    }

    const loop = () => {
      draw();
      frameRef.current = window.requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [frozen]);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <svg className="w-full" viewBox="0 0 100 125">
        <path
          d={style === "fitted" ? FITTED_PATH : UNISEX_PATH}
          fill="#0a0a0a"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
      <canvas
        ref={canvasRef}
        className="absolute left-[8%] top-[24%] w-[84%] h-[14%]"
      />
    </div>
  );
}
