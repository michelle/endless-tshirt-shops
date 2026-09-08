import { NextResponse } from "next/server";
import { designSchema } from "@/lib/design";
import { readArtworkToken } from "@/lib/art-token";
import { renderDesign } from "@/lib/render";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url),
      token = url.searchParams.get("token");
    if (request.url.length > 4000)
      return NextResponse.json(
        { error: "Artwork request too large" },
        { status: 400 },
      );
    const design = token
      ? readArtworkToken(token)
      : designSchema.parse(JSON.parse(url.searchParams.get("design") || "{}"));
    const png = await renderDesign(design, token ? 4677 : 600);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": token
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600",
        "Content-Disposition": `inline; filename="field-notes-${token ? "print" : "preview"}.png"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid artwork request" },
      { status: 400 },
    );
  }
}
