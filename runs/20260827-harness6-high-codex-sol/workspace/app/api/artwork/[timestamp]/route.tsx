import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ timestamp: string }> }) {
  const { timestamp } = await params;
  if (!/^\d{13}$/.test(timestamp)) return new Response("Invalid timestamp", { status: 400 });
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "white", fontFamily: "monospace", fontSize: 252, letterSpacing: -7 }}>{timestamp}</div>,
    { width: 3600, height: 4500 },
  );
}
