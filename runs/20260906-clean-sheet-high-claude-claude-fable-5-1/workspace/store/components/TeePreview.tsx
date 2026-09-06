"use client";

import { useMemo } from "react";
import { designSvg } from "@/lib/design";
import { COLOR_BY_ID, type DesignStyle, type StatusCode } from "@/lib/catalog";
import { mono } from "@/app/fonts";

/** Shirt silhouette in a 1000x1000 box. The print area rectangle matches the SKU's 4665:5844 aspect. */
const SHIRT_PATH =
  "M 355 118 Q 500 215 645 118 L 830 190 L 950 395 L 812 468 L 812 940 Q 812 958 794 958 L 206 958 Q 188 958 188 940 L 188 468 L 50 395 L 170 190 Z";
const PRINT = { x: 305, y: 255, w: 390, h: 489 };

export function TeePreview({
  status,
  style,
  colorId,
  className,
}: {
  status: StatusCode;
  style: DesignStyle;
  colorId: string;
  className?: string;
}) {
  const color = COLOR_BY_ID.get(colorId) ?? COLOR_BY_ID.get("black")!;
  const art = useMemo(
    () =>
      designSvg({
        status,
        style,
        ink: color.ink,
        fontFamily: mono.style.fontFamily,
        rootAttrs: `x="${PRINT.x}" y="${PRINT.y}" width="${PRINT.w}" height="${PRINT.h}"`,
      }),
    [status, style, color.ink],
  );
  return (
    <svg viewBox="0 0 1000 1000" className={className} role="img" aria-label={`${status.code} ${status.phrase} on a ${color.label} tee`}>
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <path d={SHIRT_PATH} fill={color.hex} stroke="rgba(255,255,255,0.12)" strokeWidth="4" strokeLinejoin="round" />
      <path d={SHIRT_PATH} fill="url(#shade)" />
      <path d="M 355 118 Q 500 215 645 118 Q 500 260 355 118 Z" fill="rgba(0,0,0,0.18)" />
      <g dangerouslySetInnerHTML={{ __html: art }} />
    </svg>
  );
}
