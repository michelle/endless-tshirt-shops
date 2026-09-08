import { PLATE } from "@/lib/art/plate";

/** Front-view tee with the plate placed where it actually prints:
 *  roughly 12in wide, starting a little below the collar. */
const SHIRT_PATH =
  "M296 62C330 122 470 122 504 62L562 84L726 176C733 180 735 189 731 197L668 332C664 341 653 345 645 340L606 318L606 840C606 848 599 854 591 854L209 854C201 854 194 848 194 840L194 318L155 340C147 345 136 341 132 332L69 197C65 189 67 180 74 176L238 84Z";

const COLLAR_PATH = "M296 62C330 122 470 122 504 62";

export function TeeMockup({
  garmentHex,
  plate,
  label,
}: {
  garmentHex: string;
  /** Raw plate markup (no <svg> wrapper). */
  plate: string;
  label?: string;
}) {
  // The garment body spans 412px for roughly 22in of chest, so ~18.7px per
  // inch. A 12.5in-wide print lands at 234px, starting ~3in below the collar.
  const artW = 234;
  const artH = (artW * PLATE.h) / PLATE.w;
  const artX = 400 - artW / 2;
  const artY = 182;

  return (
    <svg viewBox="0 0 800 900" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={label ?? "T-shirt preview"}>
      <defs>
        <linearGradient id="teeShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.22" />
          <stop offset="26%" stopColor="#000" stopOpacity="0" />
          <stop offset="74%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
        <clipPath id="teeClip">
          <path d={SHIRT_PATH} />
        </clipPath>
      </defs>

      <path d={SHIRT_PATH} fill={garmentHex} />
      <g clipPath="url(#teeClip)">
        <rect x="0" y="0" width="800" height="900" fill="url(#teeShade)" />
        {/* seams */}
        <path d="M194 318L194 840M606 318L606 840" stroke="#000" strokeOpacity="0.12" strokeWidth="2" fill="none" />
        <path d="M238 84C300 150 500 150 562 84" stroke="#000" strokeOpacity="0.1" strokeWidth="2" fill="none" />
      </g>
      <path d={COLLAR_PATH} fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="14" strokeLinecap="round" />
      <path d={COLLAR_PATH} fill="none" stroke={garmentHex} strokeWidth="9" strokeLinecap="round" />
      <path d={SHIRT_PATH} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="2.5" />

      <g
        transform={`translate(${artX} ${artY}) scale(${artW / PLATE.w})`}
        dangerouslySetInnerHTML={{ __html: plate }}
      />
      <text
        x="400"
        y="884"
        textAnchor="middle"
        fontFamily="Space Mono, monospace"
        fontSize="13"
        letterSpacing="3"
        fill="rgba(239,231,212,0.34)"
      >
        BELLA + CANVAS 3001 · DTG
      </text>
      <rect x="0" y="0" width="800" height="900" fill="none" />
      <title>{label ?? "T-shirt preview"}</title>
      {/* keeps the art from being clipped by the shirt outline stroke */}
      <rect x={artX - 1} y={artY - 1} width={artW + 2} height={artH + 2} fill="none" />
    </svg>
  );
}
