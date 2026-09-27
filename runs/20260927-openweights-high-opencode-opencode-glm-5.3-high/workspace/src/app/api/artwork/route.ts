import { NextResponse } from "next/server";
import { decodeSpec, verify } from "@/lib/signed";
import { renderPrintPng } from "@/lib/render";
import { validateSpec } from "@/lib/params";

/**
 * The print file endpoint. Deterministic: the artwork is a pure function of
 * the signed params, so the CDN caches it forever and any serverless instance
 * can render it on demand — Prodigi fetches this URL after payment.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const payload = url.searchParams.get("p") ?? "";
  const signature = url.searchParams.get("s") ?? "";

  if (!payload || !signature || !verify(payload, signature)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const design = decodeSpec(payload);
  if (!design) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // Re-validate the design fields (date ranges etc.) through the shared path.
  const { spec, issues } = validateSpec({ ...design, size: "m", quantity: 1 });
  if (!spec) {
    return NextResponse.json({ error: "Invalid design.", issues }, { status: 400 });
  }

  try {
    const png = renderPrintPng(spec);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("artwork render failed:", err);
    return NextResponse.json({ error: "Render failed." }, { status: 500 });
  }
}
