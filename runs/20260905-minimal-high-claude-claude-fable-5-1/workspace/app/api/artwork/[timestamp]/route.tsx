import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ARTWORK_PX, parseTimestampParam } from "@/lib/artwork";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let fontPromise: Promise<Buffer> | null = null;
function chivo(): Promise<Buffer> {
  fontPromise ??= readFile(path.join(process.cwd(), "assets", "Chivo-Medium.ttf"));
  return fontPromise;
}

/**
 * GET /api/artwork/:timestamp.png
 * The print-ready artwork: a transparent PNG the size of the shirt's print area
 * with the timestamp in white Chivo, 8in wide, 3in from the top. Prodigi fetches
 * this URL when the order is placed. Output is deterministic per timestamp.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ timestamp: string }> }) {
  const { timestamp } = await ctx.params;
  const ts = parseTimestampParam(timestamp);
  if (ts === null) return new Response("Not found", { status: 404 });

  const text = String(ts);
  // Chivo digits are ~0.6em wide; size the font so 13 digits span the text width.
  const fontSize = Math.floor(ARTWORK_PX.textWidth / (text.length * 0.6));
  const font = await chivo();

  const image = new ImageResponse(
    (
      <div
        style={{
          width: ARTWORK_PX.width,
          height: ARTWORK_PX.height,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingTop: ARTWORK_PX.textTop,
          background: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            width: ARTWORK_PX.textWidth,
            justifyContent: "center",
            fontFamily: "Chivo",
            fontSize,
            fontWeight: 500,
            color: "#ffffff",
            letterSpacing: "0.02em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
      </div>
    ),
    {
      width: ARTWORK_PX.width,
      height: ARTWORK_PX.height,
      fonts: [{ name: "Chivo", data: font, weight: 500, style: "normal" }],
    },
  );

  const headers = new Headers(image.headers);
  headers.set("Content-Type", "image/png");
  headers.set("Content-Disposition", `inline; filename="datetime-${ts}.png"`);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(image.body, { status: 200, headers });
}
