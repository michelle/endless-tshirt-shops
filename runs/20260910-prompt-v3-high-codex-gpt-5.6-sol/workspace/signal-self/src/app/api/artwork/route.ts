import { Resvg } from "@resvg/resvg-js";
import { artworkSvg } from "@/lib/artwork";
import { parseArtworkToken } from "@/lib/artwork-token";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return Response.json({ error: "Artwork token is required" }, { status: 400 });
    const customization = parseArtworkToken(token);
    const png = new Resvg(artworkSvg(customization), { background: "rgba(0,0,0,0)" }).render().asPng();
    return new Response(new Blob([new Uint8Array(png)]), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "inline; filename=signal-self-print.png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return Response.json({ error: "This artwork link is invalid" }, { status: 403 });
  }
}
