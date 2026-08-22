import { ImageResponse } from "next/og";

const WIDTH = 1600;
const HEIGHT = 2000;

export async function renderArtworkPng(timestampMs: number): Promise<Buffer> {
  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 108,
            fontWeight: 700,
            letterSpacing: -2,
            textAlign: "center",
          }}
        >
          {timestampMs}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            color: "rgba(255,255,255,0.85)",
            fontSize: 34,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          datetime.store
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
  const arrayBuffer = await image.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
