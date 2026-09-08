import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { designSeed, inkPalettes, openOrder } from "@/lib/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;" })[char] || char);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing artwork token" }, { status: 400 });
    const order = openOrder(token);
    const seed = designSeed(order);
    const palette = inkPalettes[order.ink];
    const text = order.shirtColor === "black" ? "#f2f4ed" : "#151614";
    const paths = Array.from({ length: 7 }, (_, i) => {
      const turn = (seed * (i + 7)) % 56 - 28;
      const rise = 45 + ((seed + i * 31) % 150);
      return `<path d="M ${112 + i * 19} ${330 - i * 18} C ${45 + rise} ${80 + i * 27}, ${345 - rise / 2} ${95 + turn + i * 18}, ${290 - i * 7} ${330 - i * 10}" stroke-width="${i === 2 ? 2 : 1}" opacity="${0.42 + i * 0.08}"/>`;
    }).join("");
    const points = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + (seed % 20) / 10;
      const x = 200 + Math.cos(angle) * (76 + (i % 3) * 27);
      const y = 239 + Math.sin(angle) * (76 + (i % 3) * 27);
      return `<circle cx="${x}" cy="${y}" r="${i === seed % 16 ? 5.5 : 1.8}" fill="${i === seed % 16 ? palette.accent : palette.main}"/>`;
    }).join("");
    const displayDate = new Date(`${order.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).toUpperCase();
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="4677" height="5787" viewBox="0 0 400 500">
      <g fill="none" stroke="${palette.main}" stroke-linecap="round">
        <circle cx="200" cy="239" r="151" stroke-width="1.2" opacity=".42"/><circle cx="200" cy="239" r="108" stroke-width=".8" stroke-dasharray="3 8" opacity=".7"/>
        ${paths}<path d="M55 239H345M200 74V405" stroke-width=".6" stroke-dasharray="2 9" opacity=".55"/>
      </g>${points}
      <g font-family="Arial, Helvetica, sans-serif"><text x="38" y="42" fill="${text}" font-size="11" letter-spacing="2.6">ORBIT / ${String(seed).slice(-4).padStart(4, "0")}</text>
      <text x="38" y="451" fill="${palette.main}" font-size="18" font-weight="700" letter-spacing="1.5">${escapeXml(order.place.toUpperCase().slice(0, 28))}</text>
      <text x="38" y="473" fill="${text}" font-size="9" letter-spacing="2">${escapeXml(displayDate)}  /  ${escapeXml(order.phrase.toUpperCase().slice(0, 34))}</text></g>
    </svg>`);
    const png = await sharp(svg, { limitInputPixels: false }).png({ palette: true, colours: 32, compressionLevel: 9 }).toBuffer();
    return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": "inline; filename=orbit-one-artwork.png", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Artwork rendering failed", error);
    return NextResponse.json({ error: "Invalid or expired artwork token" }, { status: 400 });
  }
}
