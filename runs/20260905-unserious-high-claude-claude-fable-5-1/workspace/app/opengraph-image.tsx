import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "datetime.store — we sell a t-shirt with the current datetime.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const chivo = await readFile(path.join(process.cwd(), "assets", "fonts", "Chivo-Medium.ttf"));
  const generatedAt = Date.now();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#000",
          color: "#fff",
          fontFamily: "Chivo",
        }}
      >
        <div style={{ fontSize: 118, letterSpacing: "0.03em", display: "flex" }}>{generatedAt}</div>
        <div style={{ fontSize: 34, color: "#a4d5ff", marginTop: 28, display: "flex" }}>
          datetime.store — we sell a t-shirt with the current datetime.
        </div>
        <div style={{ fontSize: 22, color: "#888", marginTop: 14, display: "flex" }}>
          (this image was accurate when it was generated)
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Chivo", data: chivo, weight: 500, style: "normal" }] },
  );
}
