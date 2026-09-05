import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "datetime.store — we sell a t-shirt with the current datetime.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const ts = Date.now();
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
          background: "#0a0a0a",
          color: "#fff",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 120, fontWeight: 500, letterSpacing: 2 }}>{ts}</div>
        <div style={{ display: "flex", fontSize: 36, color: "#a4d5ff", marginTop: 24 }}>datetime.store</div>
        <div style={{ display: "flex", fontSize: 28, color: "#bbb", marginTop: 8 }}>we sell a t-shirt with the current datetime.</div>
      </div>
    ),
    size,
  );
}
