import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/places";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  return NextResponse.json({ results: searchPlaces(q) }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
