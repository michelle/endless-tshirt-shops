// POST /api/print-upload — stores the customer's print file (a PNG the
// client rendered at 300 DPI) in this project's Vercel Blob store and returns
// its public URL. Prodigi downloads print files from these URLs at
// fulfillment time, so they must be publicly readable.
//
// The body is the raw PNG (no base64, no multipart) with
// Content-Type: image/png. Server checks: PNG magic bytes and a 4 MB cap
// (Vercel's request limit is 4.5 MB). Rate limiting is left to production
// (see README) — uploads are harmless orphanable images, and only URLs from
// this store's host are accepted at checkout.
import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { readRawBody, sendJson, log, BodyTooLarge } from './_lib/http.js';

const MAX_BYTES = 4 * 1024 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  if (process.env.BLOB_READ_WRITE_TOKEN === undefined) {
    return sendJson(res, 503, { error: 'print storage is not configured' });
  }
  try {
    const body = await readRawBody(req, MAX_BYTES + 1);
    if (body.length < 100) return sendJson(res, 400, { error: 'that does not look like a print file' });
    if (!body.subarray(0, 8).equals(PNG_MAGIC)) {
      return sendJson(res, 400, { error: 'print files must be PNG images' });
    }
    const pathname = `prints/${randomUUID()}.png`;
    const stored = await put(pathname, body, {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: false,
    });
    log({ printUploaded: pathname, bytes: body.length });
    return sendJson(res, 200, { url: stored.url, bytes: body.length });
  } catch (error) {
    if (error instanceof BodyTooLarge) {
      return sendJson(res, 413, { error: 'print file too large (4 MB limit)' });
    }
    log({ printUploadError: String(error) });
    return sendJson(res, 500, { error: 'could not store the print file' });
  }
}
