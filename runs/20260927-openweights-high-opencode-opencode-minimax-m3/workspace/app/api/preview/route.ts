import { NextResponse } from "next/server";
import { renderPreviewPng, type Customization } from "@/lib/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_COLOR = new Set(["navy", "black", "forest", "charcoal", "white"]);
const VALID_SIZE = new Set(["xs", "s", "m", "l", "xl", "xxl", "3xl", "4xl"]);

export async function POST(req: Request) {
  let body: Partial<Customization> & { width?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { phrase, phrase2, date, place, lat, lon, color, size } = body;
  if (
    typeof phrase !== "string" ||
    typeof date !== "string" ||
    typeof place !== "string" ||
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    !VALID_COLOR.has(String(color)) ||
    !VALID_SIZE.has(String(size))
  ) {
    return NextResponse.json({ error: "Invalid customization" }, { status: 400 });
  }
  const customization: Customization = {
    phrase: phrase.slice(0, 28),
    phrase2: typeof phrase2 === "string" ? phrase2.slice(0, 28) : "",
    date,
    place: place.slice(0, 32),
    lat,
    lon,
    color: color as Customization["color"],
    size: size as Customization["size"],
  };
  const buf = renderPreviewPng(customization, widthOf(body));
  const out = new Uint8Array(buf);
  return new NextResponse(out, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Length": String(buf.length),
    },
  });
}

function widthOf(body: { width?: number }) {
  const w = body.width ?? 900;
  return Math.min(2000, Math.max(320, w));
}
