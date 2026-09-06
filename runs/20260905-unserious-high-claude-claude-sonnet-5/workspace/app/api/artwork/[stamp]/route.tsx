import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Renders the actual print artwork for a shirt: a big, stark rendering of a
// frozen epoch-millisecond timestamp. Also doubles as the Open Graph image
// (via the special "now" stamp) and the Stripe line-item thumbnail.
//
// GET /api/artwork/1735689600000.png?fg=%23ffffff&bg=%230a0a0a
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stamp: string }> }
) {
  const { searchParams } = new URL(req.url);
  const fg = safeColor(searchParams.get("fg")) || "#f5f3ee";
  const bg = safeColor(searchParams.get("bg")) || "#0a0a0a";

  const { stamp: stampParam } = await params;
  const raw = stampParam.replace(/\.png$/i, "");
  const stamp = raw === "now" ? Date.now() : Number(raw);
  const label = Number.isFinite(stamp) ? String(Math.trunc(stamp)) : raw;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: -2,
            color: fg,
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: fg,
            opacity: 0.6,
          }}
        >
          ms since epoch
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 1500,
    }
  );
}

function safeColor(v: string | null): string | null {
  if (!v) return null;
  return /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : null;
}
