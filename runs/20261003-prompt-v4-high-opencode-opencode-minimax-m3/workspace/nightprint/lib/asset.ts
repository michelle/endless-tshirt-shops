/**
 * Asset persistence - SVGs used to drive Prodigi's print pipeline.
 *
 * We originally tried to rasterize SVG->PNG via @resvg/resvg-js, but the
 * WASM binary doesn't initialize cleanly on Vercel's serverless runtime.
 * Prodigi accepts SVG directly, so we keep the SVG as the source of truth.
 *
 * Storage strategy:
 *  - Try the cwd-relative `.data/` directory first (works on long-running
 *    servers, dev, and any host with writable disk).
 *  - Fall back to `/tmp/starprint-data` on serverless platforms (Vercel).
 *  - If both fail (read-only FS): the caller will fall back to passing a
 *    `data:` URL directly to Prodigi, which is supported.
 */
import { promises as fs } from 'fs';
import path from 'path';

const TMP_DIR_CANDIDATES = [
  () => process.env.UPLOAD_DIR,
  () => path.join(process.cwd(), '.data'),
  () => '/tmp/starprint-data',
];

export async function persistSvgAsset(
  designHash: string,
  svg: string
): Promise<string> {
  let lastErr: unknown;
  for (const mk of TMP_DIR_CANDIDATES) {
    const dir = mk();
    if (!dir) continue;
    try {
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, `${designHash}.svg`);
      await fs.writeFile(file, svg, 'utf8');
      return file;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('no writable directory');
}

/** Build the absolute URL to fetch a stored asset. */
export function assetUrl(baseUrl: string, designHash: string, ext = 'svg'): string {
  return `${baseUrl.replace(/\/$/, '')}/api/asset/${designHash}.${ext}`;
}

/** Build a `data:` URL for the provided SVG (used when no file storage is
 *  available, e.g. read-only serverless functions). */
export function dataUrlForSvg(svg: string): string {
  const buf = Buffer.from(svg, 'utf8');
  return `data:image/svg+xml;base64,${buf.toString('base64')}`;
}
