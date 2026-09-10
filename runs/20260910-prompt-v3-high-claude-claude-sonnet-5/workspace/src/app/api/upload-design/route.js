import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import crypto from "node:crypto";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024; // 15MB safety ceiling for a print-res PNG

// Uploads a client-rendered design PNG to Blob storage so it has a public
// URL Prodigi can fetch from at fulfillment time. The design itself
// (constellation art) has no user-identifying content beyond what the
// customer typed, so no moderation/PII scrubbing is performed here — see
// README "Gaps" for the lack of content moderation.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { dataUrl } = body || {};
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "Expected a PNG data URL" }, { status: 400 });
  }

  const base64 = dataUrl.slice("data:image/png;base64,".length);
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "Image is empty or too large" }, { status: 400 });
  }

  const filename = `designs/${crypto.randomUUID()}.png`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
  });

  return NextResponse.json({ url: blob.url });
}
