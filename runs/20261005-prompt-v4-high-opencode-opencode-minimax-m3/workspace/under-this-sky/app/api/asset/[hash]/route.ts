// app/api/asset/[hash]/route.ts
// Serves the print-quality asset (PNG when @resvg was available at
// order time, otherwise SVG) by URL. Both Prodigi and the success
// page fetch the asset by URL.

import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { hash: string } }
) {
  const storage = getStorage();

  // Try PNG first — most Prodigi-compatible — then SVG.
  for (const ext of ["png", "svg"] as const) {
    const filename = `${params.hash}.${ext}`;
    const asset = await storage.readAsset(filename);
    if (asset) {
      return new NextResponse(asset.bytes, {
        status: 200,
        headers: {
          "Content-Type": asset.contentType,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }
  }
  return NextResponse.json({ error: "asset not found" }, { status: 404 });
}
