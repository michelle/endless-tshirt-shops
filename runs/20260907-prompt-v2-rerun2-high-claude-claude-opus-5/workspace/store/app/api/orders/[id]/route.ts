import { NextResponse } from "next/server";
import { getOrder } from "@/lib/prodigi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (e) {
    console.error("order lookup failed", e);
    return NextResponse.json({ error: "Could not reach the print partner" }, { status: 502 });
  }
}
