"use client";

import { useMemo } from "react";
import { generateStarMap } from "@/lib/starmap";

interface Props {
  date: string;
  lat: number;
  lng: number;
  title: string;
  locationName: string;
  ink: "light" | "dark";
}

const W = 2480;
const H = 3507;
const CX = W / 2;
const CY = 1900;
const R = 880;
const SCALE = (2 * R) / 1000;

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatCoords(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}° ${latDir}, ${Math.abs(lng).toFixed(3)}° ${lngDir}`;
}

export default function StarMapPreview({ date, lat, lng, title, locationName, ink }: Props) {
  const map = useMemo(
    () => generateStarMap({ date, lat, lng, title, locationName, ink }),
    [date, lat, lng, title, locationName, ink]
  );

  const inkColor = ink === "light" ? "#f4efe4" : "#1c1c2e";
  const inkSoft = ink === "light" ? "rgba(244,239,228," : "rgba(28,28,46,";

  const toXY = (x: number, y: number) => ({
    x: CX + (x - 0.5) * 2 * R,
    y: CY + (y - 0.5) * 2 * R,
  });

  const hs = map.stars[map.highlight];
  const hp = toXY(hs.x, hs.y);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Star map for ${title}`}
    >
      {/* sky circle background */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill={ink === "light" ? "rgba(244,239,228,0.03)" : "rgba(28,28,46,0.04)"}
      />

      {/* stars */}
      {map.stars.map((s, i) => {
        const p = toXY(s.x, s.y);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={Math.max(0.5, s.r * SCALE)}
            fill={inkColor}
            opacity={s.alpha}
          />
        );
      })}

      {/* constellation lines */}
      {map.lines.map(([a, b], i) => {
        const pa = toXY(map.stars[a].x, map.stars[a].y);
        const pb = toXY(map.stars[b].x, map.stars[b].y);
        return (
          <line
            key={i}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            stroke={inkSoft + "0.35)"}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        );
      })}

      {/* highlight glow */}
      <circle cx={hp.x} cy={hp.y} r={90} fill={inkSoft + "0.18)"} />
      <circle cx={hp.x} cy={hp.y} r={45} fill={inkSoft + "0.22)"} />

      {/* highlight crosshair */}
      <g stroke={inkColor} strokeWidth={3}>
        <line x1={hp.x - 26} y1={hp.y} x2={hp.x - 12} y2={hp.y} />
        <line x1={hp.x + 12} y1={hp.y} x2={hp.x + 26} y2={hp.y} />
        <line x1={hp.x} y1={hp.y - 26} x2={hp.x} y2={hp.y - 12} />
        <line x1={hp.x} y1={hp.y + 12} x2={hp.x} y2={hp.y + 26} />
      </g>

      {/* circle border */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke={inkSoft + "0.5)"}
        strokeWidth={3}
      />

      {/* title */}
      <text
        x={CX}
        y={470}
        textAnchor="middle"
        fill={inkColor}
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontSize={150}
        fontWeight={600}
      >
        {title}
      </text>

      {/* ornament */}
      <text
        x={CX}
        y={560}
        textAnchor="middle"
        fill={inkSoft + "0.7)"}
        fontSize={40}
      >
        ✦
      </text>

      {/* date */}
      <text
        x={CX}
        y={3000}
        textAnchor="middle"
        fill={inkColor}
        fontFamily="'Inter', sans-serif"
        fontSize={72}
        fontWeight={500}
      >
        {formatDate(date)}
      </text>

      {/* location + coords */}
      <text
        x={CX}
        y={3120}
        textAnchor="middle"
        fill={inkSoft + "0.85)"}
        fontFamily="'Inter', sans-serif"
        fontSize={56}
      >
        {locationName}  ·  {formatCoords(lat, lng)}
      </text>

      {/* wordmark */}
      <text
        x={CX}
        y={3380}
        textAnchor="middle"
        fill={inkSoft + "0.6)"}
        fontFamily="'Inter', sans-serif"
        fontSize={44}
        fontWeight={500}
        letterSpacing={8}
      >
        S T E L L A R
      </text>
    </svg>
  );
}
