import { NextRequest } from "next/server";
import { buildArtworkSvg, renderArtworkPng } from "@/lib/artwork";
import { sanitizeDesign } from "@/lib/design";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  let design;
  try {
    design = sanitizeDesign({
      word: q.get("w"),
      pos: q.get("p"),
      definition: q.get("d"),
      example: q.get("e"),
      year: q.get("y"),
      size: "m",
      color: q.get("c") ?? "black",
      accent: q.get("a") ?? "gold",
    });
  } catch {
    return new Response("Invalid artwork parameters", { status: 400 });
  }
  const png = renderArtworkPng(buildArtworkSvg(design));
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export const maxDuration = 30;
