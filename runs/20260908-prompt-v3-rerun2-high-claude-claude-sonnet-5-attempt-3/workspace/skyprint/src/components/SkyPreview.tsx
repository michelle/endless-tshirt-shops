"use client";

import { DESIGN_SPACE, generateSkyDesign, type SkyDesignInput } from "@/lib/sky";

// Renders the exact same deterministic design that will end up on the
// shirt, as crisp native SVG for instant in-browser preview. The print
// file (see /api/print-file) is generated server-side from the same
// generateSkyDesign() data, so what the customer sees here is what ships.
export function SkyPreview({ input }: { input: SkyDesignInput }) {
  const design = generateSkyDesign(input);
  const { W, H } = DESIGN_SPACE;
  const moonLit = design.moon.illumination;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full rounded-2xl shadow-2xl"
      style={{ background: "linear-gradient(180deg,#0b1330 0%,#050814 100%)" }}
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff7d6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="24" y="24" width={W - 48} height={H - 48} rx="28" fill="none" stroke="#ffffff22" strokeWidth="2" />

      {design.lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="#ffffff55"
          strokeWidth="1.5"
        />
      ))}

      {design.stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
      ))}

      {/* moon: bright disc + a shadow disc offset to fake a phase */}
      <circle cx={design.moon.cx} cy={design.moon.cy} r={design.moon.r + 30} fill="url(#glow)" />
      <circle cx={design.moon.cx} cy={design.moon.cy} r={design.moon.r} fill="#fdf6e3" />
      <circle
        cx={design.moon.cx + design.moon.r * (1.15 - moonLit * 2.3)}
        cy={design.moon.cy}
        r={design.moon.r * 1.02}
        fill="#0b1330"
      />

      <text
        x={W / 2}
        y={H - 260}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="34"
        fontFamily="Georgia, serif"
        letterSpacing="2"
      >
        {design.dateLabel.toUpperCase()}
      </text>
      <text
        x={W / 2}
        y={H - 210}
        textAnchor="middle"
        fill="#ffffffaa"
        fontSize="24"
        fontFamily="Georgia, serif"
      >
        {design.timeLabel} · {design.coordLabel}
      </text>
      <text
        x={W / 2}
        y={H - 165}
        textAnchor="middle"
        fill="#ffffffaa"
        fontSize="24"
        fontFamily="Georgia, serif"
      >
        {design.locationLabel}
      </text>
      <line x1={W / 2 - 120} y1={H - 130} x2={W / 2 + 120} y2={H - 130} stroke="#ffffff44" strokeWidth="1.5" />
      {design.caption && (
        <text
          x={W / 2}
          y={H - 80}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="30"
          fontFamily="'Brush Script MT', cursive"
          fontStyle="italic"
        >
          {design.caption}
        </text>
      )}
    </svg>
  );
}
