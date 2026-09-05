import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "datetime.store — we sell a t-shirt with the current datetime";

/** A card that is, appropriately, out of date the instant it is generated. */
export default async function Image() {
  const now = Date.now();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f3ea",
          padding: "64px 72px",
          fontFamily: "monospace",
          color: "#16130f",
        }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 4 }}
        >
          <span>DATETIME.STORE</span>
          <span style={{ color: "#8d8375" }}>ONE OF ONE / NEVER AGAIN</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 108, letterSpacing: -2, lineHeight: 1 }}>
            {String(now)}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#6b6153", letterSpacing: 2 }}>
            MILLISECONDS SINCE 1970
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 40, maxWidth: 720, lineHeight: 1.25, color: "#16130f" }}>
            We sell a t-shirt with right now on it.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 26, color: "#8d8375", textDecoration: "line-through" }}>$44</span>
            <span style={{ fontSize: 44, color: "#ff4d2e" }}>$32</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
