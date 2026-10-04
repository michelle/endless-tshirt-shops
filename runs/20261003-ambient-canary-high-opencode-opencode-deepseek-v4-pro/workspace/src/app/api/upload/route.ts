// Accept an uploaded pet photo, store it in Vercel Blob, and return a public URL.

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    return storeFile(file);
  }

  // Fallback: raw binary body.
  const type = contentType.split(";")[0].trim();
  if (!ALLOWED.includes(type)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${type}` },
      { status: 415 },
    );
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }
  const blob = await put(`portraits/${Date.now()}-${crypto.randomUUID()}.img`, bytes, {
    access: "public",
    contentType: type,
  });
  return NextResponse.json({ url: blob.url });
}

async function storeFile(file: File) {
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${file.type}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }
  const blob = await put(`portraits/${Date.now()}-${crypto.randomUUID()}.img`, file, {
    access: "public",
    contentType: file.type,
  });
  return NextResponse.json({ url: blob.url });
}
