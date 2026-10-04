// Shared design-parameter validation + URL construction.
const { sign } = require('./sign');

const MAX_CAPTION = 42;
const MAX_PLACE = 60;

function cleanDesignParams(q) {
  const when = new Date(String(q.when || ''));
  if (isNaN(when.getTime())) throw new Error('invalid date');
  const year = when.getUTCFullYear();
  if (year < 1900 || year > 2100) throw new Error('date out of range');
  const lat = Number(q.lat);
  const lon = Number(q.lon);
  if (!isFinite(lat) || Math.abs(lat) > 89.9) throw new Error('invalid lat');
  if (!isFinite(lon) || Math.abs(lon) > 180) throw new Error('invalid lon');
  return {
    when: when.toISOString(),
    lat: String(Math.round(lat * 10000) / 10000),
    lon: String(Math.round(lon * 10000) / 10000),
    place: String(q.place || '').slice(0, MAX_PLACE),
    caption: String(q.caption || '').slice(0, MAX_CAPTION),
  };
}

function designUrl(base, params) {
  const qs = new URLSearchParams({ ...params, sig: sign(params) });
  return `${base}/api/design?${qs.toString()}`;
}

module.exports = { cleanDesignParams, designUrl, MAX_CAPTION };
