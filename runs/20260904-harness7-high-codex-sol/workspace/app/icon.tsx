import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2e5bed", color: "#d7ff5f", fontSize: 27, fontWeight: 700, fontFamily: "monospace", letterSpacing: -3 }}>
      dt
    </div>,
    size,
  );
}
