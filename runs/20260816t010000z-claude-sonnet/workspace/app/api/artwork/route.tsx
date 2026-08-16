import { NextRequest } from "next/server";
import { generateArtworkPng } from "@/lib/artwork";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ts = Number(req.nextUrl.searchParams.get("ts"));
  const timestamp = Number.isFinite(ts) && ts > 0 ? ts : Date.now();
  const png = await generateArtworkPng(timestamp);
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
