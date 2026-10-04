import { runtimeEnv } from "../../../lib/runtime-env";

export const runtime = "edge";

export async function POST(request: Request) {
  if (!runtimeEnv.BUCKET) return Response.json({ error: "Artwork storage is not configured yet." }, { status: 503 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 12_000_000) return Response.json({ error: "The print file is too large." }, { status: 413 });
  if (request.headers.get("content-type")?.split(";")[0] !== "image/png") return Response.json({ error: "A PNG print file is required." }, { status: 415 });
  if (!request.body) return Response.json({ error: "A PNG print file is required." }, { status: 400 });
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 12_000_000) {
      await reader.cancel();
      return Response.json({ error: "The print file is too large." }, { status: 413 });
    }
    chunks.push(value);
  }
  if (total < 24) return Response.json({ error: "The print file is not a valid PNG." }, { status: 400 });
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  if (! [137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b)) {
    return Response.json({ error: "The print file is not a valid PNG." }, { status: 400 });
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(16) !== 4680 || view.getUint32(20) !== 5790) return Response.json({ error: "The print file has the wrong dimensions." }, { status: 400 });
  const id = crypto.randomUUID();
  await runtimeEnv.BUCKET.put(id, bytes, {
    httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=2592000" },
    customMetadata: { createdAt: new Date().toISOString() },
  });
  return Response.json({ id });
}
