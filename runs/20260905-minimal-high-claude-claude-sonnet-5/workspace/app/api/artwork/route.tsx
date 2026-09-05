import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { formatTimestampForPrint, isShirtStyle } from "@/lib/shirt";

// Renders the print-ready artwork for a single shirt: the exact moment
// (epoch milliseconds + a human-readable line) that was captured when the
// customer clicked "buy". Transparent background so it prints straight onto
// a black tee. Prodigi fetches this PNG by URL at fulfillment time, and the
// order-confirmation page embeds it as a preview.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tsParam = searchParams.get("ts");
  const styleParam = searchParams.get("style");
  const ts = Number(tsParam);

  if (!tsParam || Number.isNaN(ts) || !isShirtStyle(styleParam ?? undefined)) {
    return new Response("Invalid ts or style", { status: 400 });
  }

  const { epoch, human } = formatTimestampForPrint(ts);

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
          paddingTop: 900,
          background: "transparent",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 150,
            fontWeight: 700,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          {epoch}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            color: "#ffffff",
            fontSize: 44,
            fontWeight: 400,
            opacity: 0.92,
            textAlign: "center",
          }}
        >
          {human}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 90,
            color: "#ffffff",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          datetime.store
        </div>
      </div>
    ),
    {
      width: 2400,
      height: 3000,
    }
  );
}
