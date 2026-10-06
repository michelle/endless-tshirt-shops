// Serialization, deserialization, and validation of custom celestial designs.

import { CATALOG, isValidColor, isValidSize, isValidTheme } from './catalog.js';

export function normalizeDesign(input = {}) {
  const inscription = String(input.inscription || 'UNDER THIS SKY').trim().slice(0, 50).toUpperCase() || 'UNDER THIS SKY';
  const date = String(input.date || new Date().toISOString().slice(0, 10));
  const time = String(input.time || '21:00');
  const lat = Math.max(-90, Math.min(90, Number(input.lat) || 37.7749));
  const lon = Math.max(-180, Math.min(180, Number(input.lon) || -122.4194));
  const locationName = String(input.locationName || 'SAN FRANCISCO, CA').trim().slice(0, 50).toUpperCase();
  const theme = isValidTheme(input.theme) ? input.theme.toLowerCase() : 'gold';
  const garment = isValidColor(input.garment) ? input.garment.toLowerCase() : 'black';
  const size = isValidSize(input.size) ? input.size.toLowerCase() : 'l';

  return {
    inscription,
    date,
    time,
    lat,
    lon,
    locationName,
    theme,
    garment,
    size,
  };
}

export function encodeDesign(design) {
  const norm = normalizeDesign(design);
  const json = JSON.stringify(norm);
  return Buffer.from(json).toString('base64url');
}

export function decodeDesign(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    return normalizeDesign(parsed);
  } catch {
    return null;
  }
}
