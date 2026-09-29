"use client";

// Live shirt preview: renders the same sky computation used for the print
// file onto an SVG tee silhouette.

import { useMemo } from "react";
import { computeSky, starRadius, starColor } from "@/lib/sky";

interface Props {
  date: string;
  time: string;
  lat: number;
  lon: number;
  title: string;
  color: string;
}

const SHIRT_FILL: Record<string, { base: string; shade: string; text: string; soft: string }> = {
  black: { base: "#1c1c22", shade: "#121218", text: "#f2ede1", soft: "#c8a94e" },
  "navy blue": { base: "#1d2b4d", shade: "#14203c", text: "#f2ede1", soft: "#c8a94e" },
  white: { base: "#e9e9e6", shade: "#d4d4d0", text: "#141b33", soft: "#8a6d1f" },
};

// Disc geometry inside the 400x480 shirt viewBox.
const CX = 200;
const CY = 185;
const R = 82;

export default function StarMapPreview({ date, time, lat, lon, title, color }: Props) {
  const sky = useMemo(() => computeSky({ date, time, lat, lon }), [date, time, lat, lon]);
  const fill = SHIRT_FILL[color] ?? SHIRT_FILL.black;

  return (
    <svg viewBox="0 0 400 480" role="img" aria-label="Shirt preview">
      <defs>
        <linearGradient id="shirtShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill.base} />
          <stop offset="100%" stopColor={fill.shade} />
        </linearGradient>
        <radialGradient id="prevSky" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#1b2447" />
          <stop offset="55%" stopColor="#111834" />
          <stop offset="100%" stopColor="#080d20" />
        </radialGradient>
        <clipPath id="prevDisc">
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>

      {/* tee silhouette */}
      <path
        d="M148 60 L112 72 L52 112 L82 176 L124 158 L132 420 Q200 434 268 420 L276 158 L318 176 L348 112 L288 72 L252 60 Q200 94 148 60 Z"
        fill="url(#shirtShade)"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="2"
      />
      <path
        d="M148 60 Q200 94 252 60"
        fill="none"
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* star map */}
      <circle cx={CX} cy={CY} r={R} fill="url(#prevSky)" />
      <g clipPath="url(#prevDisc)">
        <circle cx={CX} cy={CY} r={R / 3} fill="none" stroke="rgba(147,168,230,0.16)" strokeWidth="0.7" />
        <circle cx={CX} cy={CY} r={(2 * R) / 3} fill="none" stroke="rgba(147,168,230,0.16)" strokeWidth="0.7" />
        {sky.lines.map((line, i) => (
          <path
            key={i}
            d={line.points
              .map((p, j) => `${j === 0 ? "M" : "L"}${(CX + p.x * R).toFixed(1)},${(CY + p.y * R).toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke="rgba(147,168,230,0.4)"
            strokeWidth="0.5"
          />
        ))}
        {sky.stars.map((s, i) => (
          <circle
            key={i}
            cx={CX + s.x * R}
            cy={CY + s.y * R}
            r={Math.max(0.35, starRadius(s.mag) * R)}
            fill={starColor(s.bv)}
            opacity={Math.min(1, Math.max(0.35, 1.15 - s.mag / 5.5))}
          />
        ))}
      </g>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#c8a94e" strokeWidth="1.6" />
      <circle cx={CX} cy={CY} r={R + 3} fill="none" stroke="#c8a94e" strokeWidth="0.5" opacity="0.55" />

      <text x={CX} y={CY - R - 10} textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="500" fontSize="8" letterSpacing="1" fill={fill.soft}>N</text>
      <text x={CX} y={CY + R + 16} textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="500" fontSize="8" letterSpacing="1" fill={fill.soft}>S</text>
      <text x={CX - R - 10} y={CY + 3} textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="500" fontSize="8" letterSpacing="1" fill={fill.soft}>E</text>
      <text x={CX + R + 10} y={CY + 3} textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="500" fontSize="8" letterSpacing="1" fill={fill.soft}>W</text>

      {/* print text */}
      <text
        x={CX} y={318} textAnchor="middle"
        fontFamily='"Cormorant Garamond", Georgia, serif' fontWeight="600" fontStyle="italic"
        fontSize={title.length > 22 ? 16 : 20} fill={fill.text}
      >
        {title || "Your Moment"}
      </text>
      <text x={CX} y={338} textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="500" fontSize="7.5" letterSpacing="2.4" fill={fill.text}>
        {formatPreviewDate(date)} · {time}
      </text>
      <text x={CX} y={352} textAnchor="middle" fontFamily="Montserrat, sans-serif" fontSize="6" letterSpacing="1.6" fill={fill.soft}>
        {Math.abs(lat).toFixed(4)}° {lat >= 0 ? "N" : "S"} — {Math.abs(lon).toFixed(4)}° {lon >= 0 ? "E" : "W"}
      </text>
    </svg>
  );
}

function formatPreviewDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${months[(m || 1) - 1]} ${d || 1}, ${y || "————"}`;
}
