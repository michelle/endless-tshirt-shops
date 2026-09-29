// Encode/decode/validate the star-map design parameters that travel in URLs
// (artwork endpoint), Stripe metadata and sessionStorage.
export function encodeDesign(d) {
  const q = new URLSearchParams();
  q.set('v', '1');
  q.set('t', String(Math.round(d.t)));
  q.set('lat', String(d.lat));
  q.set('lng', String(d.lng));
  if (d.line1) q.set('line1', d.line1);
  if (d.place) q.set('place', d.place);
  if (d.when) q.set('when', d.when);
  if (d.coords) q.set('coords', d.coords);
  q.set('theme', d.theme === 'light' ? 'light' : 'dark');
  return q.toString();
}

export function decodeDesign(searchParams) {
  const g = (k) => searchParams.get(k);
  const t = Number(g('t'));
  const lat = Number(g('lat'));
  const lng = Number(g('lng'));
  if (!Number.isFinite(t) || t < -2208988800000 || t > 4102444800000) return null; // 1900..2100
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  const clip = (s, n) => (s ? String(s).slice(0, n) : '');
  return {
    t: Math.round(t),
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
    line1: clip(g('line1'), 42),
    place: clip(g('place'), 44),
    when: clip(g('when'), 60),
    coords: clip(g('coords'), 40),
    theme: g('theme') === 'light' ? 'light' : 'dark',
  };
}

// Stripe metadata values must be <= 500 chars each; our fields are far smaller.
export function designToMetadata(d) {
  return {
    t: String(Math.round(d.t)),
    lat: String(d.lat),
    lng: String(d.lng),
    line1: d.line1 || '',
    place: d.place || '',
    when: d.when || '',
    coords: d.coords || '',
    theme: d.theme || 'dark',
  };
}

export function metadataToDesign(md) {
  return decodeDesign({
    get: (k) => (md && md[k] != null && md[k] !== '' ? md[k] : null),
  });
}
