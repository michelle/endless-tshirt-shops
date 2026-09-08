import { mix } from "@/lib/botanical/palette";

/**
 * A simple tee silhouette with the design placed on the front print area.
 * The print box is proportional to the real 15.6" x 19.3" DTG area.
 */
export function ShirtMockup({ svg, hex, className }: { svg: string; hex: string; className?: string }) {
  const shade = mix(hex, "#000000", 0.14);
  const light = mix(hex, "#ffffff", 0.12);
  const id = `print-${hex.replace("#", "")}`;
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <svg viewBox="0 0 400 440" className={className} role="img" aria-label="T-shirt preview">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={shade} />
          <stop offset="0.18" stopColor={hex} />
          <stop offset="0.82" stopColor={hex} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
      </defs>
      {/* sleeves */}
      <path d="M150 40 L60 82 L26 166 L112 192 L112 120 Z" fill={shade} stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M250 40 L340 82 L374 166 L288 192 L288 120 Z" fill={shade} stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* body */}
      <path
        d="M150 40 C165 66 235 66 250 40 L288 56 L288 424 C288 430 284 434 278 434 L122 434 C116 434 112 430 112 424 L112 56 Z"
        fill={`url(#${id}-g)`}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* collar */}
      <path d="M150 40 C165 66 235 66 250 40 C238 52 162 52 150 40 Z" fill={light} stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
      <path d="M150 40 C165 66 235 66 250 40" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
      {/* print area: 15.6 x 19.3 in on a ~20 in body */}
      <image href={encoded} x="130" y="96" width="140" height="173.2" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}
