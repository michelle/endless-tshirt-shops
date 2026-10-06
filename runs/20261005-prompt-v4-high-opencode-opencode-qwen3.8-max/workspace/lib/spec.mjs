// Canonical, validated design spec — the single object that flows
// checkout → (metadata) → webhook → artwork URL → Prodigi order.
import { SHIRTS, SIZES, SKU, PRODIGI_COLOR } from '../public/lib/design.mjs';

const TEXT_RE = {
  city: /^[\p{L}\p{N} .'’·&-]{1,30}$/u,
  region: /^[\p{L}\p{N} .'’·&-]{0,34}$/u,
  dedication: /^[\p{L}\p{N} .'’·,&!?-]{0,28}$/u,
  label: /^[A-Z0-9 '·—-]{0,14}$/,
};

export function normalizeSpec(input) {
  const o = input || {};
  const lat = Number(o.lat), lon = Number(o.lon);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) throw new Error('lat out of range');
  if (!Number.isFinite(lon) || Math.abs(lon) > 180) throw new Error('lon out of range');
  const shirt = SHIRTS[o.shirt] ? o.shirt : 'black';
  const size = SIZES.includes(o.size) ? o.size : 'm';
  const qty = Math.min(Math.max(parseInt(o.qty, 10) || 1, 1), 5);
  const markers = Array.isArray(o.markers) ? o.markers.slice(0, 3) : [];
  const cleanMarkers = [];
  for (const m of markers) {
    if (!m || !/^\d{2}-\d{2}$/.test(m.md || '')) continue;
    const [mm, dd] = m.md.split('-').map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;
    const label = String(m.label || '').toUpperCase().replace(/[^\p{L}\p{N} '·—-]/gu, '').trim().slice(0, 14);
    if (!TEXT_RE.label.test(label)) continue;
    cleanMarkers.push({ md: m.md, label });
  }
  const spec = {
    lat: Math.round(lat * 1e4) / 1e4,
    lon: Math.round(lon * 1e4) / 1e4,
    city: String(o.city || '').trim().slice(0, 30),
    admin1: String(o.admin1 || '').trim().slice(0, 34),
    country: String(o.country || '').trim().slice(0, 30),
    dedication: String(o.dedication || '').trim().slice(0, 28),
    markers: cleanMarkers,
    shirt, size, qty,
    variant: SHIRTS[shirt].variant,
  };
  if (!TEXT_RE.city.test(spec.city)) throw new Error('city name contains unsupported characters');
  if (!TEXT_RE.region.test(spec.admin1)) throw new Error('region name contains unsupported characters');
  if (!TEXT_RE.region.test(spec.country)) throw new Error('country name contains unsupported characters');
  if (!TEXT_RE.dedication.test(spec.dedication)) throw new Error('dedication contains unsupported characters');
  return spec;
}

export function pricing(env) {
  const price = parseInt(env.PRICE_CENTS, 10) || 3800;
  const ship = parseInt(env.SHIPPING_CENTS, 10) || 795;
  return { price, ship };
}

export function totals(spec, env) {
  const { price, ship } = pricing(env);
  return { unit: price, shipping: ship, total: price * spec.qty + ship };
}

export function prodigiAttributes(spec) {
  return { color: PRODIGI_COLOR[spec.shirt], size: spec.size };
}

export { SKU };
