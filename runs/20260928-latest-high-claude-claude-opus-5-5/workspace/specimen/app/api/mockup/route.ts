import { decodeDesignParam } from "@/lib/design";
import { renderMockupPng } from "@/lib/render";

export const runtime = "nodejs";

// Deterministic shirt preview PNG (used for Stripe Checkout line item images and social previews).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const w = Math.max(200, Math.min(1200, Number(url.searchParams.get("w")) || 600));
  let png: Buffer;
  try {
    png = renderMockupPng(decodeDesignParam(url.searchParams.get("d") ?? ""), w);
  } catch {
    return new Response("Invalid design", { status: 400 });
  }
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
