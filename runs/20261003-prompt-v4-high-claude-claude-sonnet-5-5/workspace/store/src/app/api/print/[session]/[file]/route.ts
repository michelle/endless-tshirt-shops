import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { stripe } from "@/lib/stripe";
import { itemsFromMetadata } from "@/lib/orders";
import { renderDesignSvg } from "@/lib/sky";

export const maxDuration = 60;

// The print-ready artwork Prodigi downloads. Only ever rendered for sessions Stripe reports as paid.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ session: string; file: string }> }) {
  const { session, file } = await ctx.params;
  const m = /^(\d{1,2})\.png$/.exec(file);
  if (!m || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(session)) return new NextResponse("Not found", { status: 404 });
  let s;
  try {
    s = await stripe().checkout.sessions.retrieve(session);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (s.payment_status !== "paid") return new NextResponse("Payment required", { status: 402 });
  const item = itemsFromMetadata(s.metadata)?.[Number(m[1])];
  if (!item) return new NextResponse("Not found", { status: 404 });

  const png = await sharp(Buffer.from(renderDesignSvg(item.design)), { density: 72 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable" },
  });
}
