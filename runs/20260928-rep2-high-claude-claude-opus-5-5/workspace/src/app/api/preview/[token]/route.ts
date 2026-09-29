import { renderPng } from "@/lib/print";
import { verifyDesignToken } from "@/lib/sign";

export const runtime = "nodejs";

// Small preview shown on the Stripe Checkout page.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const design = verifyDesignToken((await params).token);
  if (!design) return new Response("Not found", { status: 404 });
  const png = renderPng(design, 800, true);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
