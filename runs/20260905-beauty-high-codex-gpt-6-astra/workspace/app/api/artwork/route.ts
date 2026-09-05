import {
  validArtworkSignature,
  renderArtwork,
  ART_VERSION,
} from "@/lib/artwork";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const timestamp = q.get("t") || "",
    color = q.get("c") || "",
    signature = q.get("sig") || "";
  if (
    q.get("v") !== ART_VERSION ||
    !validArtworkSignature(timestamp, color, signature)
  )
    return new Response("Not found", { status: 404 });
  const png = await renderArtwork(timestamp, color);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="datetime-${timestamp}.png"`,
    },
  });
}
