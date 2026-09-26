"use client";

import type { GarmentColor } from "@/lib/products";
import type { ReactNode } from "react";

/**
 * A calm vector tee mockup with the chart placed as a full front DTG print.
 */
export default function TeeMockup({ color, children }: { color: GarmentColor; children: ReactNode }) {
  const id = color.id.replace(/[^a-z0-9]/g, "");
  return (
    <div className="tee-stage">
      <svg className="tee-svg" viewBox="0 0 520 560" role="img" aria-label="T-shirt mockup">
        <defs>
          <linearGradient id={`body-${id}`} x1="0" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor={color.hi} />
            <stop offset="0.55" stopColor={color.swatch} />
            <stop offset="1" stopColor={color.lo} />
          </linearGradient>
          <radialGradient id={`sheen-${id}`} cx="0.5" cy="0.28" r="0.55">
            <stop offset="0" stopColor="#ffffff" stopOpacity={color.ink === "light" ? 0.10 : 0.35} />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M 200 40
             C 220 62 300 62 320 40
             L 432 72
             C 482 90 502 122 492 152
             L 380 210
             C 372 216 362 214 356 224
             L 366 520
             Q 366 538 348 538
             L 172 538
             Q 154 538 154 520
             L 164 224
             C 158 214 148 216 140 210
             L 28 152
             C 18 122 38 90 88 72
             Z"
          fill={`url(#body-${id})`}
        />
        <path
          d="M 200 40
             C 220 62 300 62 320 40
             L 432 72
             C 482 90 502 122 492 152
             L 380 210
             C 372 216 362 214 356 224
             L 366 520
             Q 366 538 348 538
             L 172 538
             Q 154 538 154 520
             L 164 224
             C 158 214 148 216 140 210
             L 28 152
             C 18 122 38 90 88 72
             Z"
          fill={`url(#sheen-${id})`}
        />
        {/* collar */}
        <path d="M 198 36 C 222 16 298 16 322 36 C 300 56 220 56 198 36 Z" fill={color.lo} />
        <path
          d="M 200 40 C 222 20 298 20 320 40"
          fill="none"
          stroke={color.hi}
          strokeWidth="3"
          opacity="0.55"
        />
        {/* seam hints */}
        <path d="M 164 224 L 154 520 M 356 224 L 366 520" fill="none" stroke="#000" strokeWidth="1.4" opacity="0.12" />
        <path d="M 174 524 L 346 524" fill="none" stroke="#000" strokeWidth="1.2" opacity="0.10" />
      </svg>
      <div className="print-holder">{children}</div>
    </div>
  );
}
