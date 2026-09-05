import { readFile } from "node:fs/promises";
import path from "node:path";

/** Chivo static TTFs bundled with the app (see next.config outputFileTracingIncludes). */
const dir = path.join(process.cwd(), "assets", "fonts");
let cache: Promise<{ bold: ArrayBuffer; regular: ArrayBuffer }> | null = null;

function toArrayBuffer(b: Buffer): ArrayBuffer {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

export function loadChivo() {
  if (!cache) {
    cache = Promise.all([readFile(path.join(dir, "Chivo-700.ttf")), readFile(path.join(dir, "Chivo-400.ttf"))]).then(
      ([bold, regular]) => ({ bold: toArrayBuffer(bold), regular: toArrayBuffer(regular) }),
    );
  }
  return cache;
}
