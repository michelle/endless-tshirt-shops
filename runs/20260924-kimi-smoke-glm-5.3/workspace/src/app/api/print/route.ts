import { NextRequest, NextResponse } from "next/server";
import { decodeSpec } from "@/lib/spec";
import { starmapSvg } from "@/lib/starmap";
import { renderSvgToPng } from "@/server/render";
import { verifySpec } from "@/server/signing";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Stateless, signed print endpoint. Prodigi fetches this URL when it prepares
 * the print file; the success page uses it for the customer's art. The PNG is
 * deterministic — same spec, same pixels, forever — so it is safe to cache
 * immutably.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const p = searchParams.get("p") ?? "";
  const s = searchParams.get("s") ?? "";
  const w = Number(searchParams.get("w") ?? "2480");

  const encoded = verifySpec(p, s);
  if (encoded === null) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }
  const decoded = decodeSpec(encoded);
  if (!decoded.ok) {
    return NextResponse.json({ error: "invalid spec" }, { status: 400 });
  }

  try {
    const svg = starmapSvg(decoded.spec);
    const png = await renderSvgToPng(svg, { width: Number.isFinite(w) ? w : 2480 });
    return new NextResponse(Buffer.from(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("render failed", (e as Error).stack);
    return NextResponse.json({ error: "render failed" }, { status: 500 });
  }
}
