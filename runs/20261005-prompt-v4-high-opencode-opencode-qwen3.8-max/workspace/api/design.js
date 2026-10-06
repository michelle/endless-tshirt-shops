// POST /api/design — normalizes a client spec server-side and returns the
// canonical spec, its signature and the public artwork URL.
import { readBody, json, cors, fail } from '../lib/http.mjs';
import { normalizeSpec } from '../lib/spec.mjs';
import { artUrl } from '../lib/fulfill.mjs';
import { artSign } from '../lib/sign.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.end();
  if (req.method !== 'POST') return fail(res, 405, 'POST only');
  try {
    const raw = typeof req.body === 'string' ? req.body : await readBody(req);
    const input = JSON.parse(raw || '{}');
    const spec = normalizeSpec(input);
    const base = process.env.PUBLIC_BASE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    json(res, 200, { spec, sig: artSign(spec), artUrl: artUrl(base, spec) });
  } catch (e) {
    fail(res, 400, e.message);
  }
}
