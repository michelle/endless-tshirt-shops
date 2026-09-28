import { NextRequest, NextResponse } from "next/server";
import { getProdigiOrder } from "@/lib/prodigi";

export const dynamic = "force-dynamic";

const DEFAULT_SECRET = "es-cb-7f3a9c1d52b84e6a90d1f3c5b7a9e2f4d";

/**
 * Prodigi order-progress callback (CloudEvents envelope, unsigned by Prodigi —
 * so the unguessable path is the shared secret). We never trust the payload:
 * re-read the order from the API before it influences anything.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { secret: string } }
) {
  const expected = process.env.PRODIGI_CALLBACK_SECRET || DEFAULT_SECRET;
  if (params.secret !== expected) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let envelope: { id?: string; type?: string; subject?: string; time?: string };
  try {
    envelope = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const orderId = envelope.subject;
  if (orderId) {
    const order = await getProdigiOrder(orderId).catch(() => null);
    console.log(
      `Prodigi callback: ${envelope.type} for ${orderId}; stage=${order?.order?.status?.stage}`
    );
  }
  return new NextResponse(null, { status: 204 });
}
