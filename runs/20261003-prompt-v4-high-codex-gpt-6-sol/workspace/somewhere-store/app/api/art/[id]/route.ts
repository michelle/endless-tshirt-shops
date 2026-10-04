import { bindings, getOrder } from "@/lib/store";

export const runtime = "edge";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const order = await getOrder(id);
    if (!order || !["processing", "submitted", "fulfillment_failed"].includes(order.status)) return new Response(null, { status: 404 });
    const file = await bindings().bucket.get(`art/${id}.png`);
    if (!file) return new Response(null, { status: 404 });
    return new Response(file.body, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
  } catch { return new Response(null, { status: 503 }); }
}
