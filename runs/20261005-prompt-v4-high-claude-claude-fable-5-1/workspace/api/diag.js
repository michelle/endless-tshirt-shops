// Render-engine diagnostics (no secrets). Useful when a serverless platform lacks a native binary.
import { json } from '../lib/http.js';

export default async function handler(req, res) {
  const out = { node: process.version, platform: `${process.platform}-${process.arch}` };
  try {
    const { getEngine, svgToPng } = await import('../lib/render.js');
    const eng = await getEngine();
    out.engine = eng.kind;
    const t0 = Date.now();
    const png = await svgToPng('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="40" font-family="DM Serif Display" font-size="32">Ok</text></svg>');
    out.testRender = { bytes: png.length, ms: Date.now() - t0 };
  } catch (e) {
    out.error = String(e?.stack || e);
  }
  json(res, 200, out, { 'Cache-Control': 'no-store' });
}
