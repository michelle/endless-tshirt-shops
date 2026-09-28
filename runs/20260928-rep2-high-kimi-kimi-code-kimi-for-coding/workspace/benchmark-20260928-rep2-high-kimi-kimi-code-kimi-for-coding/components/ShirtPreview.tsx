"use client";

import { useEffect, useRef } from "react";
import type { WaveformStyle } from "@/lib/catalog";

interface Props {
  samples: number[] | null;
  style: WaveformStyle;
  ink: string;
  garment: string; // swatch hex
}

const W = 700;
const H = 760;

/** Stylized tee silhouette with the customer's waveform printed on the chest. */
export default function ShirtPreview({ samples, style, ink, garment }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    // ---- garment ----
    ctx.save();
    teePath(ctx);
    ctx.fillStyle = garment;
    ctx.fill();
    // soft fabric shading
    ctx.clip();
    const grad = ctx.createLinearGradient(0, 100, 0, 660);
    grad.addColorStop(0, "rgba(255,255,255,0.14)");
    grad.addColorStop(0.5, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.13)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // a couple of fold hints
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(300, 300);
    ctx.quadraticCurveTo(310, 480, 298, 620);
    ctx.moveTo(408, 300);
    ctx.quadraticCurveTo(398, 480, 410, 620);
    ctx.stroke();
    ctx.restore();

    // outline
    teePath(ctx);
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // neck rib
    ctx.beginPath();
    ctx.moveTo(268, 128);
    ctx.quadraticCurveTo(350, 186, 432, 128);
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    ctx.lineWidth = 5;
    ctx.stroke();

    // ---- print ----
    const band = { x: 252, y: 318, w: 196, h: 118 };
    if (samples) {
      const aspect = band.w / band.h;
      const dampen = Math.min(1, 4.5 / aspect);
      const mid = band.y + band.h / 2;
      const colW = band.w / samples.length;
      ctx.save();
      teePath(ctx);
      ctx.clip();
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      if (style === "fill") {
        for (let i = 0; i < samples.length; i++) {
          const half = (0.06 + 0.44 * samples[i]) * band.h * dampen;
          ctx.fillRect(band.x + i * colW, mid - half, colW + 0.6, half * 2);
        }
      } else {
        ctx.lineWidth = Math.max(3, band.h * 0.045);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const x = band.x + i * colW;
          const y = mid + (samples[i] - 0.5) * band.h * 0.86 * dampen;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.save();
      teePath(ctx);
      ctx.clip();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 2;
      roundRect(ctx, band.x, band.y, band.w, band.h, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.font = "500 15px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("your sound will appear here", 350, band.y + band.h / 2 + 5);
      ctx.restore();
    }
  }, [samples, style, ink, garment]);

  return (
    <canvas
      ref={ref}
      className="preview-canvas"
      width={W}
      height={H}
      aria-label="T-shirt preview"
    />
  );
}

function teePath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(350, 118);
  ctx.quadraticCurveTo(300, 116, 266, 128); // neck -> left shoulder
  ctx.lineTo(148, 184); // sleeve outer
  ctx.lineTo(188, 290); // sleeve cuff
  ctx.lineTo(238, 262); // under sleeve
  ctx.lineTo(230, 636); // left side
  ctx.quadraticCurveTo(350, 656, 470, 636); // hem
  ctx.lineTo(462, 262); // right side
  ctx.lineTo(512, 290); // under sleeve right
  ctx.lineTo(552, 184); // sleeve outer right
  ctx.lineTo(434, 128); // right shoulder
  ctx.quadraticCurveTo(400, 116, 350, 118); // back to neck
  ctx.closePath();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
