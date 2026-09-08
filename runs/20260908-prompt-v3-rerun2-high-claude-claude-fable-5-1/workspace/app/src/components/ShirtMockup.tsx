"use client";

import { useMemo } from "react";
import { Design, SHIRT_COLORS } from "@/lib/design";
import { starMapSvg, PRINT_W, PRINT_H } from "@/lib/starmap";

/**
 * A t-shirt silhouette with the artwork placed at true scale: the Gildan 64000
 * front print area is 15.6in wide on a ~20in wide body.
 */
export function ShirtMockup({ design, className, id = "mock" }: { design: Design; className?: string; id?: string }) {
  const inner = useMemo(() => {
    const svg = starMapSvg(design, { fullCanvas: true, id });
    return svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  }, [design, id]);

  const color = SHIRT_COLORS.find((c) => c.key === design.color) ?? SHIRT_COLORS[0];
  const isLight = color.ink === "dark";

  // Body spans x 130..470 (340px ~ 20in). Print area 15.6in -> 265px wide.
  const paW = 265;
  const paH = (paW * PRINT_H) / PRINT_W;
  const paX = 300 - paW / 2;
  const paY = 108;

  return (
    <svg viewBox="0 0 600 630" className={className} role="img" aria-label="Preview of your shirt">
      <defs>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={isLight ? 0.12 : 0.35} />
          <stop offset="0.25" stopColor="#000" stopOpacity="0" />
          <stop offset="0.75" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={isLight ? 0.12 : 0.35} />
        </linearGradient>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#${id}-soft)`}>
        <path
          d="M 212 32 C 245 68 355 68 388 32 L 462 62 L 566 205 L 472 262 L 472 600 L 128 600 L 128 262 L 34 205 L 138 62 Z"
          fill={color.hex}
        />
        <path
          d="M 212 32 C 245 68 355 68 388 32 L 462 62 L 566 205 L 472 262 L 472 600 L 128 600 L 128 262 L 34 205 L 138 62 Z"
          fill={`url(#${id}-shade)`}
        />
        {/* sleeve seams */}
        <path d="M 128 262 L 138 62" stroke="#000" strokeOpacity={isLight ? 0.08 : 0.3} strokeWidth="2" fill="none" />
        <path d="M 472 262 L 462 62" stroke="#000" strokeOpacity={isLight ? 0.08 : 0.3} strokeWidth="2" fill="none" />
        {/* collar */}
        <path
          d="M 212 32 C 245 68 355 68 388 32 C 360 96 240 96 212 32 Z"
          fill="#000"
          fillOpacity={isLight ? 0.08 : 0.3}
        />
        <path
          d="M 212 32 C 245 68 355 68 388 32"
          stroke={isLight ? "#000" : "#fff"}
          strokeOpacity={isLight ? 0.15 : 0.12}
          strokeWidth="3"
          fill="none"
        />
      </g>
      <svg x={paX} y={paY} width={paW} height={paH} viewBox={`0 0 ${PRINT_W} ${PRINT_H}`} dangerouslySetInnerHTML={{ __html: inner }} />
    </svg>
  );
}
