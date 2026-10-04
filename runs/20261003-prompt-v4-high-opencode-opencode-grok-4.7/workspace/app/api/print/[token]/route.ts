import { renderPrintPng } from "@/lib/render";
import { readDesign } from "@/lib/token";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const spec = readDesign(decodeURIComponent(token));
    const png = renderPrintPng(spec);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not render print";
    return new Response(message, { status: 400, headers: { "Content-Type": "text/plain" } });
  }
}
