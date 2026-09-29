import { NextRequest, NextResponse } from "next/server";
import { decodeDesign } from "@/lib/design";
import { renderPrintPNG } from "@/lib/render";
import { b64urlDecode, verify } from "@/lib/sign";

export const runtime = "nodejs";

/**
 * GET /api/print-file?d=<base64url compact design JSON>&s=<hmac>
 *
 * Serves the 4680x5790 print-ready PNG (300 DPI for the 15.6"x19.3" front
 * print area of GLOBAL-TEE-BC-3001). Deterministic regeneration: the
 * timeline is frozen in the payload, so the bytes match the md5 hash sent
 * with the Prodigi order forever. Requests are HMAC-gated so only orders
 * this app created can mint print files.
 */
export async function GET(req: NextRequest) {
  const d = req.nextUrl.searchParams.get("d");
  const s = req.nextUrl.searchParams.get("s");

  if (!d || !s || !verify(d, s)) {
    return new NextResponse("not found", { status: 404 });
  }

  let design;
  try {
    design = decodeDesign(JSON.parse(b64urlDecode(d)));
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
  if (!design) {
    return new NextResponse("not found", { status: 404 });
  }

  try {
    const png = renderPrintPNG(design);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Print-Resolution": "4680x5790",
      },
    });
  } catch {
    return new NextResponse("render failed", { status: 500 });
  }
}
