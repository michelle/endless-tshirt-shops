import { NextRequest } from "next/server";
import { safeDecodeDesign } from "@/lib/design";
import { describeSky } from "@/lib/skymap";

export const dynamic = "force-dynamic";

/** GET /api/sky?d=<encoded design> → what's overhead (star count, constellations, UTC instant). */
export async function GET(req: NextRequest) {
  const design = safeDecodeDesign(req.nextUrl.searchParams.get("d"));
  if (!design) return Response.json({ error: "Bad design" }, { status: 400 });
  return Response.json(describeSky(design));
}
