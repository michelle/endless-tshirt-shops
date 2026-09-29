import { NextResponse } from "next/server";
import { validateDesign, decodeDesign } from "@/lib/design";
import { verifyPayload } from "@/lib/sign";
import { renderArtworkPng } from "@/lib/artwork";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const p = searchParams.get("p");
  const sig = searchParams.get("sig");
  if (!p || !sig || !verifyPayload(p, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let design;
  try {
    design = validateDesign(decodeDesign(p));
  } catch {
    return NextResponse.json({ error: "Invalid design" }, { status: 400 });
  }

  const png = renderArtworkPng(design);
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      // Deterministic per design; Prodigi fetches it once at order time.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
