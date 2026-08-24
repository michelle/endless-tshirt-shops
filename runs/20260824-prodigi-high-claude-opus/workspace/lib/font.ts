import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Chivo Bold, the typeface the shirt is printed in.
 *
 * The TTF ships in the repo and is traced into the serverless bundle (see
 * `outputFileTracingIncludes` in next.config.mjs). If that ever fails we fall
 * back to Google Fonts rather than failing an order — a shirt printed from a
 * CDN-fetched font is fine; a shirt that never prints is not.
 */

const LOCAL_PATH = path.join(process.cwd(), 'assets', 'Chivo-Bold.ttf');
const REMOTE_URL =
  'https://fonts.gstatic.com/s/chivo/v21/va9b4kzIxd1KFppkaRKvDRPJVDf_Wxjulw.ttf';

let cache: Promise<ArrayBuffer> | undefined;

async function load(): Promise<ArrayBuffer> {
  try {
    const buffer = await readFile(LOCAL_PATH);
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
  } catch (error) {
    console.warn('[font] local Chivo-Bold.ttf unavailable, fetching from CDN', error);
    const response = await fetch(REMOTE_URL, { cache: 'force-cache' });
    if (!response.ok) {
      throw new Error(`Could not load Chivo Bold (${response.status})`);
    }
    return response.arrayBuffer();
  }
}

export function chivoBold(): Promise<ArrayBuffer> {
  cache ??= load();
  return cache;
}
