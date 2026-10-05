import { buildSvg } from "@/lib/design";
import { decodeDesign } from "@/lib/schema";

export const runtime = "nodejs";

/** Live SVG preview. Identical to the artwork that is rasterised for print. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("d") ?? "";
  try {
    const svg = buildSvg(decodeDesign(token));
    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message = (error as Error).message.replace(/[<>&]/g, "");
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#0d1024"/><text x="400" y="410" fill="#c9a24b" font-size="28" text-anchor="middle">${message}</text></svg>`,
      { status: 400, headers: { "content-type": "image/svg+xml; charset=utf-8" } },
    );
  }
}
