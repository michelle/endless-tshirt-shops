import { runtimeEnv } from "../../../../lib/runtime-env";

export const runtime = "edge";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !runtimeEnv.BUCKET) return new Response("Not found", { status: 404 });
  const object = await runtimeEnv.BUCKET.get(id);
  if (!object) return new Response("Not found", { status: 404 });
  const created = object.customMetadata?.createdAt;
  if (!created || Date.now() - Date.parse(created) > 35 * 24 * 60 * 60 * 1000) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
