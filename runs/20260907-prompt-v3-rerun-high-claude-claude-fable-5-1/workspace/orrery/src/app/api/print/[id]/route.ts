import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { decodeDesign } from "@/lib/design";
import { renderPng } from "@/lib/render";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Print-ready file (4677×5881 px, 300 dpi, transparent) for a paid Checkout Session.
 * Prodigi downloads this URL. The session id is unguessable and the artwork is
 * regenerated from the session metadata, so the print always matches what was paid for.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessionId = id.replace(/\.png$/i, "");
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return new NextResponse("Not found", { status: 404 });
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return new NextResponse("Order not paid", { status: 402 });
    const design = decodeDesign(session.metadata?.design);
    const png = renderPng(design);
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Content-Disposition": `inline; filename="orrery-${sessionId}.png"`, "Cache-Control": "private, max-age=3600" },
    });
  } catch (e) {
    console.error("print render error", e);
    return new NextResponse("Not found", { status: 404 });
  }
}
