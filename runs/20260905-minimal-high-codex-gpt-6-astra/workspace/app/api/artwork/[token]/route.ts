import { verifyDesign } from "@/lib/security";
import { renderArtwork } from "@/lib/artwork";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  let design;
  try {
    design = verifyDesign(token);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const png = await renderArtwork(design.timestamp);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="datetime-${design.timestamp}.png"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
