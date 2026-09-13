import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { allowedBadges, allowedColors, verifyDesignSignature } from "@/lib/order";

export const runtime = "nodejs";

const esc = (value: string) => value.replace(/[&<>"']/g, (letter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[letter] || letter);
const badgeIcon: Record<string, string> = { spark: "✦", sun: "☀", rocket: "↗", wave: "〰" };

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const design = { moment: query.get("moment") || "", name: query.get("name") || "", badge: query.get("badge") || "", color: query.get("color") || "" };
  const sig = query.get("sig") || "";
  if (!design.moment || design.moment.length > 42 || !design.name || design.name.length > 18 || !allowedBadges.includes(design.badge as never) || !allowedColors.includes(design.color as never) || !verifyDesignSignature(design, sig)) return new NextResponse("Not found", { status: 404 });
  const ink = design.color === "black" ? "#F7D63A" : design.color === "white" ? "#EA5046" : "#17263C";
  const svg = `<svg width="2490" height="3510" viewBox="0 0 2490 3510" xmlns="http://www.w3.org/2000/svg"><rect width="2490" height="3510" fill="transparent"/><g fill="${ink}" text-anchor="middle"><text x="1245" y="1260" font-family="Arial, sans-serif" font-size="86" font-weight="800" letter-spacing="18">TINY TRIUMPH</text><path d="M850 1360h790" stroke="${ink}" stroke-width="12"/><text x="1245" y="1575" font-family="Georgia, serif" font-size="176" font-style="italic" font-weight="700">${esc(design.moment)}</text><text x="1245" y="1770" font-family="Arial, sans-serif" font-size="78" font-weight="800" letter-spacing="20">${esc(design.name)}</text><circle cx="1245" cy="2045" r="135" fill="${ink}"/><text x="1245" y="2105" font-family="Arial, sans-serif" font-size="170" font-weight="800" fill="${design.color === "black" ? "#202431" : design.color === "white" ? "#FFFFFF" : "#F4EDDD"}">${badgeIcon[design.badge]}</text><text x="1245" y="2305" font-family="Arial, sans-serif" font-size="40" font-weight="700" letter-spacing="11">WEAR THE EVIDENCE</text></g></svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable", "Content-Disposition": "inline; filename=tiny-triumph.png" } });
}
