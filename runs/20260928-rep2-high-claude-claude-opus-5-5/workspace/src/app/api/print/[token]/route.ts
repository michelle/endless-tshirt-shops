import { renderPng } from "@/lib/print";
import { verifyDesignToken } from "@/lib/sign";

export const runtime = "nodejs";
export const maxDuration = 60;

// Full-resolution (4680 x 5790) transparent PNG that Prodigi downloads and prints.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const design = verifyDesignToken((await params).token);
  if (!design) return new Response("Not found", { status: 404 });
  const png = renderPng(design);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="overhead-print.png"`,
    },
  });
}
