import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// Generates the actual print-ready artwork for a shirt: the exact datetime
// the customer bought it, frozen forever. Prodigi fetches this URL by its
// query string at fulfillment time, so everything the print needs to be
// reproduced lives in the URL itself — no database required.
//
// Aspect ratio matches Prodigi's DTG front print area for our SKUs
// (4665 x 5844 px), scaled down for a fast, print-safe PNG.
const WIDTH = 1500;
const HEIGHT = 1878;

function safeText(v: string | null, fallback: string, max = 64): string {
  if (!v) return fallback;
  return v.slice(0, max);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = safeText(searchParams.get("date"), "1970-01-01");
  const time = safeText(searchParams.get("time"), "00:00:00.000");
  const tz = safeText(searchParams.get("tz"), "UTC", 24);

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
          fontFamily: '"Courier New", ui-monospace, monospace',
        }}
      >
        <div
          style={{
            display: "flex",
            width: "82%",
            borderTop: "3px solid white",
            marginBottom: 40,
          }}
        />
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          {date}
        </div>
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 108,
            fontWeight: 700,
            letterSpacing: 1,
            marginTop: 18,
          }}
        >
          {time}
        </div>
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 34,
            fontWeight: 400,
            opacity: 0.85,
            marginTop: 16,
            letterSpacing: 6,
          }}
        >
          {tz}
        </div>
        <div
          style={{
            display: "flex",
            width: "82%",
            borderTop: "3px solid white",
            marginTop: 40,
            marginBottom: 56,
          }}
        />
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: 4,
          }}
        >
          DATETIME.STORE
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    },
  );
}
