import { Resvg } from "@resvg/resvg-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const palettes: Record<string, { accent: string; second: string }> = {
  amber: { accent: "#ffc847", second: "#e7673e" },
  blue: { accent: "#77bcff", second: "#c88cff" },
  rose: { accent: "#ff8bbd", second: "#ffca79" }
};
const glyphs: Record<string, string> = { Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓" };
const safe = (value: string, fallback: string, max: number) => value.replace(/[<>&"']/g, "").slice(0, max) || fallback;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = safe(searchParams.get("name") || "YOUR NAME", "YOUR NAME", 24).toUpperCase();
  const place = safe(searchParams.get("place") || "YOUR COORDINATES", "YOUR COORDINATES", 28).toUpperCase();
  const sign = glyphs[searchParams.get("sign") || "Aquarius"] ? (searchParams.get("sign") || "Aquarius") : "Aquarius";
  const colors = palettes[searchParams.get("palette") || "amber"] || palettes.amber;
  const stars = Array.from({ length: 38 }, (_, index) => {
    const x = (index * 173 + 61) % 860 + 70; const y = (index * 97 + 37) % 1390 + 90; const r = index % 7 === 0 ? 5 : 2;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.3 + (index % 5) / 8}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3307" height="4606" viewBox="0 0 1000 1500">
    <defs><radialGradient id="g"><stop stop-color="${colors.second}" stop-opacity=".55"/><stop offset=".55" stop-color="#19284c" stop-opacity=".2"/><stop offset="1" stop-color="#07111f" stop-opacity="0"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <rect width="1000" height="1500" fill="#091322"/><circle cx="500" cy="660" r="520" fill="url(#g)"/>${stars}
    <circle cx="500" cy="690" r="245" fill="none" stroke="${colors.accent}" stroke-width="2" opacity=".75"/><circle cx="500" cy="690" r="160" fill="none" stroke="#fff" stroke-width="1" opacity=".4"/>
    <path d="M300 780 L420 575 L570 730 L720 480" fill="none" stroke="${colors.accent}" stroke-width="6" stroke-linecap="round"/><circle cx="300" cy="780" r="11" fill="${colors.accent}"/><circle cx="420" cy="575" r="11" fill="${colors.accent}"/><circle cx="570" cy="730" r="11" fill="${colors.accent}"/><circle cx="720" cy="480" r="11" fill="${colors.accent}"/>
    <text x="500" y="205" text-anchor="middle" fill="#e8e3d6" font-family="Arial, sans-serif" font-size="26" letter-spacing="8">STAR SIGNAL STUDIO</text><text x="500" y="1100" text-anchor="middle" fill="${colors.accent}" font-family="Georgia, serif" font-size="150">${glyphs[sign]}</text>
    <text x="500" y="1230" text-anchor="middle" fill="#f7f2e8" font-family="Georgia, serif" font-size="66">${name}</text><text x="500" y="1295" text-anchor="middle" fill="#d8d4cc" font-family="Arial, sans-serif" font-size="24" letter-spacing="5">${place}</text><line x1="260" x2="740" y1="1345" y2="1345" stroke="${colors.accent}" stroke-width="2"/><text x="500" y="1400" text-anchor="middle" fill="${colors.accent}" font-family="Arial, sans-serif" font-size="20" letter-spacing="5">${sign.toUpperCase()} / FIELD NOTE</text>
  </svg>`;
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 3307 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
