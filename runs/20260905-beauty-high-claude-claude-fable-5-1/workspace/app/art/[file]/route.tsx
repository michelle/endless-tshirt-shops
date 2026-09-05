import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseTs } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /art/{ts}.png?ink=white|black            → print-ready artwork
 * GET /art/{ts}.png?preview=1&bg=black|white   → small mock-up for receipts
 *
 * The print file mirrors the Bella + Canvas front print area (15.6 × 19.3 in)
 * at 150 dpi with a transparent background. Prodigi scales it with
 * "fillPrintArea", so the digits land ~3 in below the collar, ~8.5 in wide.
 * Exactly what the buyer saw on the shirt.
 */

const PRINT_W = 2340; // 15.6in × 150dpi
const PRINT_H = 2895; // 19.3in × 150dpi
const PRINT_TOP = 0.16; // digits start 16% down the print area (~3 in)
const PRINT_TEXT_W = 0.55; // digits span 55% of print width (~8.5 in)

let fontCache: Promise<ArrayBuffer> | null = null;
function font(): Promise<ArrayBuffer> {
  if (!fontCache) {
    fontCache = readFile(path.join(process.cwd(), "fonts", "SpaceMono-Bold.ttf")).then(
      (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
    );
  }
  return fontCache;
}

// Space Mono's advance width is 0.612em; 13 digits → 7.956em.
const MONO_ADVANCE = 0.612;
const DIGITS = 13;

export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const m = /^(\d{13})\.png$/.exec(file);
  const ts = m ? parseTs(m[1]) : null;
  if (!ts) return NextResponse.json({ error: "Expected /art/<13-digit-ms>.png" }, { status: 404 });

  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "1";
  const bg = url.searchParams.get("bg") === "white" ? "white" : "black";
  const inkParam = url.searchParams.get("ink");
  const ink = preview ? (bg === "white" ? "#101014" : "#f4f1ea") : inkParam === "black" ? "#000000" : "#ffffff";

  const W = preview ? 600 : PRINT_W;
  const H = preview ? 750 : PRINT_H;
  const textW = W * PRINT_TEXT_W;
  const fontSize = Math.floor(textW / (DIGITS * MONO_ADVANCE));
  const top = Math.round(H * PRINT_TOP);

  const fontData = await font();
  const text = String(ts);

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: preview ? (bg === "white" ? "#f4f1ea" : "#101014") : "transparent",
        }}
      >
        <div
          style={{
            marginTop: top,
            fontFamily: "Space Mono",
            fontSize,
            lineHeight: 1,
            color: ink,
            letterSpacing: 0,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [{ name: "Space Mono", data: fontData, weight: 700, style: "normal" }],
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
