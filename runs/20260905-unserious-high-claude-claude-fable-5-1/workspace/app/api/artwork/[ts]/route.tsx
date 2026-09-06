import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ARTWORK } from "@/lib/config";
import { parseTimestamp } from "@/lib/time";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The artwork. A very large, mostly transparent PNG containing one number.
 *
 * /api/artwork/1757100000000.png        -> full print-area resolution (4677x5881)
 * /api/artwork/1757100000000.png?w=800  -> scaled preview
 *
 * Deterministic for a given timestamp, so it is cached forever.
 */

let fontData: Promise<Buffer> | null = null;
function chivo(): Promise<Buffer> {
  if (!fontData) {
    fontData = readFile(path.join(process.cwd(), "assets", "fonts", "Chivo-Medium.ttf"));
  }
  return fontData;
}

// Chivo Medium digits are ~0.585em wide. Thirteen of them plus tracking
// should span ARTWORK.textWidthInches at ARTWORK.dpi.
const DIGIT_EM = 0.585;
const TRACKING_EM = 0.03;

export function artworkFontSize(digits: number, width: number): number {
  return width / (digits * (DIGIT_EM + TRACKING_EM));
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ ts: string }> }) {
  const { ts: raw } = await ctx.params;
  const ts = parseTimestamp(raw);
  if (ts === null) {
    return NextResponse.json(
      { error: "That is not a datetime. We would know; it's all we sell." },
      { status: 404 },
    );
  }

  const wParam = Number(req.nextUrl.searchParams.get("w") || ARTWORK.width);
  const width = Math.min(ARTWORK.width, Math.max(160, Math.round(wParam) || ARTWORK.width));
  const scale = width / ARTWORK.width;
  const height = Math.round(ARTWORK.height * scale);
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  const text = String(ts);
  const textWidth = ARTWORK.textWidthInches * ARTWORK.dpi * scale;
  const fontSize = artworkFontSize(text.length, textWidth);
  const top = ARTWORK.topOffsetInches * ARTWORK.dpi * scale;

  const font = await chivo();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: top,
          backgroundColor: debug ? "#111" : "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Chivo",
            fontWeight: ARTWORK.fontWeight,
            fontSize,
            letterSpacing: `${TRACKING_EM}em`,
            lineHeight: 1,
            color: "#ffffff",
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [{ name: "Chivo", data: font, weight: ARTWORK.fontWeight, style: "normal" }],
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="datetime-${ts}.png"`,
      },
    },
  );
}
