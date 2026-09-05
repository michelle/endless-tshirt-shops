import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/prodigi/callback
 * Prodigi posts order status changes here (we pass callbackUrl on every order).
 * There's no database in this deployment, so we log and acknowledge. Status
 * is always readable live via /api/orders/:sessionId.
 */
export async function POST(req: Request) {
  let body: unknown = null;
  try { body = await req.json(); } catch { /* ignore */ }
  const order = (body as { order?: { id?: string; merchantReference?: string; status?: { stage?: string } } } | null)?.order;
  console.log(`[prodigi callback] order=${order?.id} ref=${order?.merchantReference} stage=${order?.status?.stage}`);
  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "Prodigi posts order updates here." });
}
