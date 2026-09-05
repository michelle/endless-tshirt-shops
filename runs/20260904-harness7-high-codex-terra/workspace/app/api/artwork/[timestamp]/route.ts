import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ timestamp: string }> }) {
  const timestamp = (await params).timestamp;
  if (!/^\d{13}$/.test(timestamp)) return new NextResponse("Not found", { status: 404 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4665" height="5844" viewBox="0 0 4665 5844"><rect width="100%" height="100%" fill="transparent"/><text x="2332.5" y="2922" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="255" font-weight="500" text-anchor="middle" letter-spacing="-16">${timestamp}</text></svg>`;
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
