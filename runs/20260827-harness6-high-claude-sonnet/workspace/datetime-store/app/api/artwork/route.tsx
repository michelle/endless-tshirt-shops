import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { formatMs, isShirtStyle } from "@/lib/shirt";

export const runtime = "nodejs";

// Generates the print-ready artwork for the shirt's front print area:
// the frozen millisecond timestamp on a transparent background, so it
// prints directly onto the garment fabric via Prodigi.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tsParam = searchParams.get("ts");
  const styleParam = searchParams.get("style");
  const ts = Number(tsParam);
  const style = isShirtStyle(styleParam) ? styleParam : "unisex";

  if (!tsParam || !Number.isFinite(ts)) {
    return new Response("Missing or invalid ts", { status: 400 });
  }

  const label = formatMs(ts);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 300,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "rgba(255,255,255,0.55)",
            fontSize: 28,
            letterSpacing: 10,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          datetime.store
        </div>
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: 2,
            textAlign: "center",
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            color: "rgba(255,255,255,0.45)",
            fontSize: 24,
            marginTop: 20,
          }}
        >
          milliseconds since Jan 1, 1970 UTC
        </div>
        <div
          style={{
            display: "flex",
            color: "rgba(255,255,255,0.35)",
            fontSize: 20,
            marginTop: 140,
          }}
        >
          {style === "fitted" ? "Fitted" : "Unisex"} · $22.50
        </div>
      </div>
    ),
    { width: 1600, height: 2000 },
  );
}
