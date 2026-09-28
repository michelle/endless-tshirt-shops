import { NextResponse, type NextRequest } from "next/server";
import { renderPrintPng, type Customization } from "@/lib/render";
import { verify } from "@/lib/tokens";

// The signed PNG asset. Prodigi pulls this once when it processes the order,
// and the storefront hits it for the rendered print preview at higher DPI.
//
// We deliberately re-render on demand rather than caching the PNG: Vercel
// serverless storage is ephemeral, and the cost is a few hundred ms of CPU.
// Swapping in Vercel Blob for caching is a one-function change.

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const decoded = decodeURIComponent(params.token);
  const customization = verify<Customization>(decoded);
  if (!customization) {
    return new NextResponse("Invalid token", { status: 400 });
  }

  const buf = renderPrintPng(customization);
  const body = new Uint8Array(buf);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(buf.length),
    },
  });
}
