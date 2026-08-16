import { ImageResponse } from "@vercel/og";

const WIDTH = 1000;
const HEIGHT = 260;

// Renders the print-ready artwork: the live/frozen Unix millisecond
// timestamp in white on a transparent background, sized for a chest print.
export async function generateArtworkPng(timestampMs: number): Promise<Buffer> {
  const label = String(timestampMs);
  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: "0.02em",
            fontFamily: "monospace",
          }}
        >
          {label}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
