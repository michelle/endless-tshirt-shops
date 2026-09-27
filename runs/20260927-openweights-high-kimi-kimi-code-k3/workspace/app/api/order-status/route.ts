import { NextRequest, NextResponse } from "next/server";
import { findOrderByRef } from "@/lib/prodigi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref") || "";
  if (!ref || ref.length > 128) {
    return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  }
  try {
    const status = await findOrderByRef(ref);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
