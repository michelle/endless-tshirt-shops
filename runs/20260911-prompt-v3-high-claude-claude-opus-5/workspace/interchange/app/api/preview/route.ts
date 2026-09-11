import { NextRequest } from "next/server";
import { renderBack, renderFront } from "@/lib/render";
import { sanitizeSpec } from "@/lib/spec";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const spec = sanitizeSpec(body?.spec ?? body);
  const svg = body?.side === "back" ? renderBack(spec) : renderFront(spec);
  return new Response(svg, {
    headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "no-store" },
  });
}
