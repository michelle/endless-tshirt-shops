import { ImageResponse } from "next/og";
import { isStyleId } from "@/lib/products";

export const runtime = "nodejs";

// Renders the actual print-ready artwork for a shirt: the exact millisecond
// timestamp the customer bought, frozen at checkout time. This is the same
// URL we hand to Prodigi as the front print asset, so what the customer saw
// on the product page is exactly what gets printed.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tsParam = searchParams.get("ts");
  const style = searchParams.get("style");
  const ts = tsParam ? Number(tsParam) : NaN;

  if (!tsParam || Number.isNaN(ts) || ts < 0) {
    return new Response("Invalid or missing ts", { status: 400 });
  }

  const date = new Date(ts);
  const iso = date.toISOString();
  const [datePart, timePartRaw] = iso.split("T");
  const timePart = timePartRaw.replace("Z", " UTC");

  const width = 1600;
  const height = 2000;
  const accent = isStyleId(style) && style === "fitted" ? "#ff6ad5" : "#7cf7ff";

  return new ImageResponse(
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
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "84%",
            padding: "48px 56px",
            flexDirection: "column",
            alignItems: "center",
            borderTop: `4px solid ${accent}`,
            borderBottom: `4px solid ${accent}`,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 34,
              letterSpacing: 10,
              color: accent,
              marginBottom: 28,
              textTransform: "uppercase",
            }}
          >
            datetime.store
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 128,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: 2,
              lineHeight: 1,
              textAlign: "center",
              wordBreak: "break-all",
            }}
          >
            {ts}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 32,
              fontSize: 40,
              color: "#ffffff",
              letterSpacing: 4,
            }}
          >
            {datePart}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 8,
              fontSize: 32,
              color: accent,
              letterSpacing: 4,
            }}
          >
            {timePart}
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
