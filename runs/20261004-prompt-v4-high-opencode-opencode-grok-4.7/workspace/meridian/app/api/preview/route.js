import { renderMockupSVG } from "../../../lib/starmap.js";
import { parseSpec } from "../../../lib/spec.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { spec, errors } = parseSpec({ ...body, title: body.title || "Your moment", qty: body.qty || 1 });
  const blocking = errors.filter((e) => !e.startsWith("Give the moment"));
  if (blocking.length) {
    return Response.json({ error: blocking[0] }, { status: 400 });
  }
  const svg = renderMockupSVG(spec).replace(/<\?xml[^>]*\?>/, "").trim();
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
