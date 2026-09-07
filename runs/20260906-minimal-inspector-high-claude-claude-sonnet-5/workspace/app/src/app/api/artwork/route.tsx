import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// Renders the print-ready artwork for a datetime.store shirt: the exact
// millisecond timestamp the shopper froze at checkout, in white on a
// transparent background so it DTG-prints straight onto black fabric.
//
// This is a pure function of `ts` (epoch ms) — Prodigi fetches this URL
// when it prepares the print job, and anyone can re-render the exact
// artwork for a past order by requesting the same `ts`.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ts = searchParams.get("ts");

  if (!ts || !/^\d{1,14}$/.test(ts)) {
    return new Response("Missing or invalid ts", { status: 400 });
  }

  const date = new Date(Number(ts));
  const iso = Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().replace("T", "  ").replace("Z", " UTC");

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
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 190,
            fontWeight: 700,
            letterSpacing: -4,
          }}
        >
          {ts}
        </div>
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 54,
            marginTop: 36,
            opacity: 0.85,
          }}
        >
          {iso}
        </div>
      </div>
    ),
    {
      width: 1500,
      height: 1800,
    }
  );
}
