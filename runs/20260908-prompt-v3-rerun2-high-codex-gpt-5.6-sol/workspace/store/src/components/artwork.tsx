import { contourPaths, PALETTES, seedFromDesign, type Design } from "@/lib/design";

export function Artwork({ design, tone, formattedDate }: { design: Design; tone: "light" | "dark"; formattedDate: string }) {
  const paths = contourPaths(design);
  const palette = PALETTES[design.palette];
  const ink = tone === "light" ? "#f1efe8" : "#111719";
  const seed = seedFromDesign(design);
  const orbitTilt = -24 + (seed % 17);
  return (
    <svg viewBox="0 0 520 640" role="img" aria-label={`Orbital map for ${design.name} and ${design.place}`}>
      <g fill="none" stroke={ink} strokeWidth="1.5" opacity=".88">{paths.map((path, index) => <path d={path} key={index} />)}</g>
      <ellipse cx="260" cy="270" rx="218" ry="98" transform={`rotate(${orbitTilt} 260 270)`} fill="none" stroke={palette.primary} strokeWidth="4" />
      <circle cx="260" cy="270" r="8" fill={ink} />
      <circle cx="417" cy="158" r="10" fill={palette.primary} />
      <path d="M96 474H424M260 69V458" stroke={ink} opacity=".45" strokeWidth="1" strokeDasharray="3 9" />
      <path d="M381 248l7 15 15 7-15 7-7 15-7-15-15-7 15-7z" fill={palette.accent} />
      <text x="32" y="532" fill={ink} fontFamily="Arial, sans-serif" fontWeight="700" fontSize="26" letterSpacing="5">{design.name.slice(0, 18)}</text>
      <text x="32" y="564" fill={ink} fontFamily="Arial, sans-serif" fontSize="13" letterSpacing="2.4">{design.place.slice(0, 28)}  /  {formattedDate}</text>
      <line x1="32" y1="583" x2="488" y2="583" stroke={palette.primary} strokeWidth="3" />
      <text x="32" y="614" fill={ink} fontFamily="Arial, sans-serif" fontSize="10" letterSpacing="1.45">{design.note.slice(0, 42)}</text>
    </svg>
  );
}
