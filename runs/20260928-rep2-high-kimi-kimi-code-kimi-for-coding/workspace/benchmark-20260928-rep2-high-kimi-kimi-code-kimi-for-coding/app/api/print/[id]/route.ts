import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { renderPrintPng } from "@/lib/render-print";
import { decodeSamples } from "@/lib/design";
import { GARMENT_COLORS } from "@/lib/catalog";
import type { Size, WaveformStyle } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stripe = getStripe();
    const id = params.id.replace(/\.png$/i, "");
    const session = await stripe.checkout.sessions.retrieve(id);
    const md = session.metadata || {};
    if (!md.d || !md.style || !md.ink || !md.color || !md.size) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const png = renderPrintPng({
      samples: decodeSamples(md.d),
      style: md.style as WaveformStyle,
      ink: md.ink,
      color: md.color,
      size: md.size as Size,
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("print render error", err);
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
