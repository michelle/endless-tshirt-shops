// POST /api/design — validate a design spec, mint its content-addressed token.
// Response: { token, design, errors, sky } where sky summarizes the computed night.
const { normalizeDesign } = require('../lib/design');
const { computeSky } = require('../lib/astro');
const { json, readBody, kvSet } = require('../lib/server');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  let raw;
  try {
    raw = JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { error: 'invalid JSON body' });
  }
  const { design, token, errors } = normalizeDesign(raw);
  if (errors.length) return json(res, 422, { errors, design, token });

  const sky = computeSky({ date: new Date(design.utc), lat: design.lat, lng: design.lng });
  const summary = {
    starsVisible: sky.stars.length,
    moonPhase: sky.moon.name,
    moonIlluminated: Math.round(sky.moon.illuminated * 100),
    sunAltitude: +sky.sun.alt.toFixed(1),
  };

  // best-effort persistence (in-memory fallback if no KV provisioned)
  await kvSet(`design:${token}`, design).catch(() => {});

  return json(res, 200, { token, design, errors: [], sky: summary });
};
