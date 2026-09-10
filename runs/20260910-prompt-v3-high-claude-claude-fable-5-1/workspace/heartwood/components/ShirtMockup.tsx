import type { ShirtColor } from "@/lib/catalog";

/**
 * A simple, honest tee mockup: SVG silhouette in the chosen colour with the design
 * placed where the DTG print goes (large chest print).
 */
export function ShirtMockup({ color, artSvg, id = "m" }: { color: ShirtColor; artSvg: string; id?: string }) {
  const shade = color.dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";
  const seam = color.dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
  const body =
    "M238 104 Q300 96 362 104 L420 100 Q470 106 520 128 L582 258 Q585 268 575 272 L478 306 Q466 310 462 300 L462 650 Q462 664 448 664 L152 664 Q138 664 138 650 L138 300 Q134 310 122 306 L25 272 Q15 268 18 258 L80 128 Q130 106 180 100 Z";
  return (
    <svg viewBox="0 0 600 700" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${color.label} t-shirt with your ring design`}>
      <defs>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={color.dark ? 0.10 : 0.35} />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={color.dark ? 0.25 : 0.08} />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#2a1c0e" floodOpacity="0.22" />
        </filter>
      </defs>
      <g filter={`url(#${id}-shadow)`}>
        <path d={body} fill={color.hex} />
      </g>
      <path d={body} fill={`url(#${id}-sheen)`} />
      {/* sleeve seams and hem */}
      <path d="M138 300 L80 128 M462 300 L520 128" stroke={seam} strokeWidth="2" fill="none" />
      <path d="M150 648 L450 648" stroke={seam} strokeWidth="1.5" fill="none" />
      {/* collar */}
      <path d="M238 104 Q300 96 362 104 Q300 176 238 104 Z" fill={shade} />
      <path d="M232 100 Q300 88 368 100 Q300 190 232 100 Z" fill="none" stroke={seam} strokeWidth="3" />
      {/* print area */}
      <g dangerouslySetInnerHTML={{ __html: artSvg }} />
    </svg>
  );
}
