import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import {
  ARTWORK_TOP_IN,
  ARTWORK_WIDTH_IN,
  artworkText,
  FONT_FAMILY,
  INK_COLOR,
  parseArtworkFileName,
  PRINT_HEIGHT,
  PRINT_WIDTH,
  PRINT_WIDTH_IN,
} from "@/lib/artwork";

export const runtime = "nodejs";

let fontData: Promise<Buffer> | null = null;
function chivo(): Promise<Buffer> {
  fontData ??= readFile(path.join(process.cwd(), "src", "fonts", "Chivo-Regular.ttf"));
  return fontData;
}

/**
 * GET /api/artwork/<timestamp>.png
 * The print-ready front artwork for a shirt: a transparent PNG the size of the
 * tee's print area with the Unix millisecond timestamp in white Chivo. Prodigi
 * downloads this URL when the order is placed. Deterministic, so cache forever.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const timestamp = parseArtworkFileName(file);
  if (timestamp === null) {
    return NextResponse.json({ error: "Expected /api/artwork/<unix-ms>.png" }, { status: 404 });
  }

  const text = artworkText(timestamp);
  const pxPerInch = PRINT_WIDTH / PRINT_WIDTH_IN;
  const targetWidth = ARTWORK_WIDTH_IN * pxPerInch;
  // Chivo digits are ~0.57em wide with the tracking below; solve for font size.
  const letterSpacingEm = 0.03;
  const fontSize = Math.round(targetWidth / (text.length * (0.57 + letterSpacingEm)));
  const top = Math.round(ARTWORK_TOP_IN * pxPerInch);

  return new ImageResponse(
    (
      <div
        style={{
          width: PRINT_WIDTH,
          height: PRINT_HEIGHT,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingTop: top,
          backgroundColor: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: FONT_FAMILY,
            fontSize,
            lineHeight: 1,
            letterSpacing: `${letterSpacingEm}em`,
            color: INK_COLOR,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
      </div>
    ),
    {
      width: PRINT_WIDTH,
      height: PRINT_HEIGHT,
      fonts: [{ name: FONT_FAMILY, data: await chivo(), weight: 400, style: "normal" }],
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="datetime-${text}.png"`,
      },
    },
  );
}
