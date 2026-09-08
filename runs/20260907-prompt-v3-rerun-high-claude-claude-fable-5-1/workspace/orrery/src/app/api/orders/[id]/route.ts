import { NextResponse } from "next/server";
import { orderView } from "@/lib/fulfil";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const view = await orderView(id);
    return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
