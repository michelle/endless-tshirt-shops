/**
 * The print file. A transparent PNG the size of the tee's front print area, with the
 * epoch-millisecond timestamp in white Chivo and the UTC datetime beneath it —
 * the same composition the on-screen shirt shows.
 */
import { ImageResponse } from "next/og";
import { STYLES, formatUtc, type Design } from "./products";
import { LAYOUT } from "./layout";
import { loadChivo } from "./fonts";



export async function renderArtwork(design: Design, opts: { scale?: number } = {}): Promise<Response> {
  const { printArea } = STYLES[design.style];
  const scale = opts.scale ?? 1;
  const width = Math.round(printArea.width * scale);
  const height = Math.round(printArea.height * scale);
  const fonts = await loadChivo();
  const epochSize = width * LAYOUT.epochFontSize;
  const utcSize = width * LAYOUT.utcFontSize;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: height * LAYOUT.epochTop,
          color: "#ffffff",
          fontFamily: "Chivo",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: epochSize,
            fontWeight: 700,
            letterSpacing: width * LAYOUT.letterSpacing,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {String(design.timestamp)}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: width * LAYOUT.utcGap,
            fontSize: utcSize,
            fontWeight: 400,
            letterSpacing: utcSize * 0.18,
            lineHeight: 1,
            whiteSpace: "nowrap",
            opacity: 0.92,
          }}
        >
          {formatUtc(design.timestamp)}
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [
        { name: "Chivo", data: fonts.bold, weight: 700, style: "normal" },
        { name: "Chivo", data: fonts.regular, weight: 400, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="datetime-${design.style}-${design.timestamp}.png"`,
      },
    },
  );
}
