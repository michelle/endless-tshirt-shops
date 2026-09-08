import { NextRequest } from "next/server";
import sharp from "sharp";

const palettes = {
  midnight: { ink: "#d7ff3f", accent: "#6f6cff", bg: "#111318" },
  ember: { ink: "#ff765f", accent: "#ffd18a", bg: "#241817" },
  ultraviolet: { ink: "#d29bff", accent: "#6df2dc", bg: "#21172d" },
} as const;

function hashPhrase(value: string) { return [...value].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 17); }

export async function GET(request: NextRequest) {
  const phrase = (request.nextUrl.searchParams.get("phrase") || "your signal").replace(/[^a-zA-Z0-9 .,!?'&-]/g, "").slice(0, 32);
  const theme = (request.nextUrl.searchParams.get("theme") || "midnight") as keyof typeof palettes;
  const palette = palettes[theme] || palettes.midnight;
  const seed = hashPhrase(phrase);
  const points = Array.from({ length: 54 }, (_, index) => {
    const x = 40 + index * 67;
    const y = 290 + Math.sin(index * 0.56 + seed / 19) * (42 + seed % 36) + ((seed + index * 17) % 30);
    return `${x},${y.toFixed(1)}`;
  }).join(" ");
  const words = phrase.toUpperCase().split(" ").slice(0, 4).join(" / ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3600" height="4800" viewBox="0 0 3600 4800"><rect width="3600" height="4800" fill="none"/><g transform="translate(350 900) scale(1.2)"><rect width="2700" height="1700" rx="40" fill="${palette.bg}"/><g opacity=".25" stroke="${palette.ink}" stroke-width="10">${Array.from({length:8},(_,i)=>`<path d="M100 ${160+i*190}H2600"/>`)}${Array.from({length:10},(_,i)=>`<path d="M${100+i*280}V1550"/>`)}</g><polyline points="${points}" fill="none" stroke="${palette.accent}" stroke-width="85" opacity=".16"/><polyline points="${points}" fill="none" stroke="${palette.ink}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><text x="120" y="300" fill="${palette.ink}" font-family="Arial,sans-serif" font-weight="700" font-size="190" letter-spacing="28">${words}</text><text x="120" y="1500" fill="${palette.accent}" font-family="Arial,sans-serif" font-weight="700" font-size="80" letter-spacing="18">FREQ. ${String(seed).slice(-4)} · SIGNAL / NOISE</text></g></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
