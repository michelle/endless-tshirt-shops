import { readFile } from 'node:fs/promises';
import path from 'node:path';

let cached: Promise<ArrayBuffer> | null = null;

/**
 * Chivo Bold, vendored into the repo rather than fetched from Google at request
 * time: the print asset must render identically forever, and a network hop in the
 * artwork path is a great way to ship a customer a blank shirt.
 */
export function chivoBold(): Promise<ArrayBuffer> {
  cached ??= readFile(path.join(process.cwd(), 'public', 'fonts', 'Chivo-Bold.ttf')).then(
    (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  return cached;
}
