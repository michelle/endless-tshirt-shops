import { readFile } from 'node:fs/promises';
import path from 'node:path';

let cached: Promise<ArrayBuffer> | null = null;

/**
 * Chivo Bold, the typeface the original store set the timestamp in.
 *
 * Satori needs real font bytes; it cannot use a webfont URL. The file is read
 * once per warm lambda and memoised, because the artwork endpoint may be hit
 * several times in a row while Prodigi prepares print assets.
 */
export function chivoBold(): Promise<ArrayBuffer> {
  if (!cached) {
    cached = readFile(path.join(process.cwd(), 'public', 'fonts', 'Chivo-Bold.ttf')).then(
      (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    );
  }
  return cached;
}
