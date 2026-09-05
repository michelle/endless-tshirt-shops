import { ImageResponse } from "next/og";
import { loadChivo } from "@/lib/fonts";

export const alt = "datetime.store — we sell a t-shirt with the current datetime.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function OpenGraphImage() {
  const { bold } = await loadChivo();
  const now = Date.now();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Chivo",
        }}
      >
        <div style={{ fontSize: 110, letterSpacing: 4 }}>{String(now)}</div>
        <div style={{ fontSize: 34, color: "#a4d5ff", marginTop: 30 }}>datetime.store — we sell a t-shirt with the current datetime.</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Chivo", data: bold, weight: 700, style: "normal" }] },
  );
}
