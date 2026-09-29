"use client";
import { useMemo } from "react";
import { renderSvg, type ChartInfo } from "@/lib/chart";
import { SHIRTS, type Design } from "@/lib/design";

export function useChart(design: Design): { svg: string; info: ChartInfo } {
  return useMemo(() => renderSvg(design), [design]);
}

/** Artwork only, on a fabric-coloured background (what the printer receives). */
export function FlatArt({ design, svg }: { design: Design; svg: string }) {
  return (
    <div className="flat" style={{ background: SHIRTS[design.shirt].fabric, padding: "6%" }} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

/** A simple t-shirt mockup with the artwork placed at true-to-scale chest print size. */
export function ShirtMockup({ design, svg }: { design: Design; svg: string }) {
  const fabric = SHIRTS[design.shirt].fabric;
  const light = SHIRTS[design.shirt].ink === "dark";
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const id = design.shirt;
  return (
    <div className="mock">
      <svg viewBox="0 0 1000 1000" role="img" aria-label="T-shirt preview">
        <defs>
          <linearGradient id={`shade-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity={light ? 0.1 : 0.35} />
            <stop offset=".22" stopColor="#000" stopOpacity="0" />
            <stop offset=".78" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity={light ? 0.1 : 0.35} />
          </linearGradient>
          <linearGradient id={`light-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={light ? 0 : 0.06} />
            <stop offset="1" stopColor="#000" stopOpacity={light ? 0.06 : 0.2} />
          </linearGradient>
        </defs>
        <path
          d="M378,52 C420,96 580,96 622,52 L792,104 C850,125 905,210 962,328 L846,398 L792,318 L794,952 C640,972 360,972 206,952 L208,318 L154,398 L38,328 C95,210 150,125 208,104 Z"
          fill={fabric}
          stroke={light ? "#c9c9c4" : "#000"}
          strokeOpacity={light ? 1 : 0.5}
          strokeWidth="2"
        />
        <path d="M378,52 C420,96 580,96 622,52 L792,104 C850,125 905,210 962,328 L846,398 L792,318 L794,952 C640,972 360,972 206,952 L208,318 L154,398 L38,328 C95,210 150,125 208,104 Z" fill={`url(#shade-${id})`} />
        <path d="M378,52 C420,96 580,96 622,52 L792,104 C850,125 905,210 962,328 L846,398 L792,318 L794,952 C640,972 360,972 206,952 L208,318 L154,398 L38,328 C95,210 150,125 208,104 Z" fill={`url(#light-${id})`} />
        <path d="M378,52 C420,96 580,96 622,52" fill="none" stroke={light ? "#b9b9b3" : "#000"} strokeOpacity={light ? 1 : 0.55} strokeWidth="16" />
        <path d="M208,318 L208,300 M792,318 L792,300" stroke="#000" strokeOpacity=".25" strokeWidth="2" />
        {/* print area ≈ 12" wide on a ~20" body */}
        <svg x="322" y="168" width="356" height="440" viewBox="0 0 1000 1237" dangerouslySetInnerHTML={{ __html: inner }} />
      </svg>
    </div>
  );
}
