import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ARTWORK_HEIGHT, ARTWORK_WIDTH, buildArtworkElement } from "@/lib/artwork";
import { isShirtColor } from "@/lib/product";

export const runtime = "nodejs";

const fontsDir = join(process.cwd(), "src", "fonts");
const regularFont = readFile(join(fontsDir, "SpaceMono-Regular.ttf"));
const boldFont = readFile(join(fontsDir, "SpaceMono-Bold.ttf"));

const MIN_TS = 1600000000000; // 2020-09-13
const MAX_TS = 4000000000000; // 2096-09-26

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const tsRaw = searchParams.get("ts");
  const colorRaw = searchParams.get("color") ?? "white";

  const ts = tsRaw ? Number(tsRaw) : NaN;
  if (!Number.isInteger(ts) || ts < MIN_TS || ts > MAX_TS) {
    return new Response("Invalid or missing ts query parameter (epoch milliseconds).", {
      status: 400,
    });
  }
  const color = isShirtColor(colorRaw) ? colorRaw : "white";

  const [regular, bold] = await Promise.all([regularFont, boldFont]);

  return new ImageResponse(buildArtworkElement(ts, color), {
    width: ARTWORK_WIDTH,
    height: ARTWORK_HEIGHT,
    fonts: [
      { name: "SpaceMono", data: regular, weight: 400, style: "normal" },
      { name: "SpaceMono", data: bold, weight: 700, style: "normal" },
    ],
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
