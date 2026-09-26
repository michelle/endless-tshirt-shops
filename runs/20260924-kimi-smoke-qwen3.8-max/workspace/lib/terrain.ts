/**
 * Terrain acquisition (server-only).
 *
 * Elevation data comes from the AWS Terrain Tiles "terrarium" dataset
 * (open data on AWS, originally Mapzen/Nextzen, sources include SRTM,
 * USGS NED, ETOPO1 bathymetry). Tiles are 256x256 PNGs where
 *   elevation(m) = (R * 256 + G + B / 256) - 32768
 *
 * We stitch the tiles covering a bounding box around the customer's point
 * and resample them onto a regular grid that the contour renderer uses.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { Terrain } from './terrain-types';

export type { Terrain } from './terrain-types';

const TILE = 256;
const EARTH_RADIUS_M = 6371008;
const TILE_URL = (z: number, x: number, y: number) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

// --- web-mercator helpers -------------------------------------------------

function worldPx(z: number): number {
  return TILE * Math.pow(2, z);
}

function mercX(lon: number, z: number): number {
  return ((lon + 180) / 360) * worldPx(z);
}

function mercYn(lat: number): number {
  // normalised 0..1 mercator y (north = 0)
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
}

function mercY(lat: number, z: number): number {
  return mercYn(lat) * worldPx(z);
}

export function bboxFor(lat: number, lon: number, radiusKm: number) {
  const dLat = radiusKm / 110.574;
  const cos = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  const dLon = radiusKm / (111.32 * cos);
  return {
    lat0: Math.max(-84.9, lat - dLat),
    lat1: Math.min(84.9, lat + dLat),
    lon0: lon - dLon,
    lon1: lon + dLon,
  };
}

function pickZoom(bbox: ReturnType<typeof bboxFor>): number {
  // span in "degrees" for both axes (y converted from normalised mercator)
  const spanDeg = Math.max(bbox.lon1 - bbox.lon0, (mercYn(bbox.lat0) - mercYn(bbox.lat1)) * 360);
  // want bbox to span at most ~640 px: spanPx = spanDeg/360 * 256 * 2^z ≤ 640
  const targetPx = 640;
  const z = Math.floor(Math.log2((targetPx * 360) / (spanDeg * TILE)));
  return Math.min(14, Math.max(2, z));
}

// --- tile cache -----------------------------------------------------------

const tileCache = new Map<string, Float32Array>();
const TILE_CACHE_MAX = 120;

function cacheSet(key: string, val: Float32Array) {
  if (tileCache.size >= TILE_CACHE_MAX) {
    const oldest = tileCache.keys().next().value;
    if (oldest !== undefined) tileCache.delete(oldest);
  }
  tileCache.set(key, val);
}

async function decodeTile(z: number, x: number, y: number): Promise<Float32Array | null> {
  const key = `${z}/${x}/${y}`;
  const hit = tileCache.get(key);
  if (hit) return hit;

  const max = Math.pow(2, z);
  // wrap x, clamp y (missing polar/ocean tiles → null)
  const xx = ((x % max) + max) % max;
  if (y < 0 || y >= max) return null;

  let buf: ArrayBuffer | null = null;
  for (let attempt = 0; attempt < 2 && !buf; attempt++) {
    try {
      const res = await fetch(TILE_URL(z, xx, y), {
        signal: AbortSignal.timeout(20000),
        headers: { 'user-agent': 'lay-of-the-land-store/1.0' },
      });
      if (res.ok) buf = await res.arrayBuffer();
    } catch {
      // retry / fall through
    }
  }
  if (!buf) {
    // Missing coverage (deep ocean at high zoom etc.) — treat as sea level.
    const flat = new Float32Array(TILE * TILE).fill(0);
    cacheSet(key, flat);
    return flat;
  }

  const img = await loadImage(Buffer.from(buf));
  const c = createCanvas(TILE, TILE);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, TILE, TILE);
  const elev = new Float32Array(TILE * TILE);
  for (let i = 0; i < elev.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    elev[i] = r * 256 + g + b / 256 - 32768;
  }
  cacheSet(key, elev);
  return elev;
}

// --- terrain cache --------------------------------------------------------

const terrainCache = new Map<string, Terrain>();
const TERRAIN_CACHE_MAX = 48;

function terrainCacheSet(key: string, t: Terrain) {
  if (terrainCache.size >= TERRAIN_CACHE_MAX) {
    const oldest = terrainCache.keys().next().value;
    if (oldest !== undefined) terrainCache.delete(oldest);
  }
  terrainCache.set(key, t);
}

// --- main entry -----------------------------------------------------------

export async function fetchTerrain(
  lat: number,
  lon: number,
  radiusKm: number,
  n = 420,
): Promise<Terrain> {
  const cacheKey = `${lat.toFixed(4)}|${lon.toFixed(4)}|${radiusKm}|${n}`;
  const hit = terrainCache.get(cacheKey);
  if (hit) return hit;

  const bbox = bboxFor(lat, lon, radiusKm);
  const z = pickZoom(bbox);

  const px0 = mercX(bbox.lon0, z);
  const px1 = mercX(bbox.lon1, z);
  const py0 = mercY(bbox.lat1, z); // north edge
  const py1 = mercY(bbox.lat0, z); // south edge
  const spanX = px1 - px0;
  const spanY = py1 - py0;

  const tx0 = Math.floor(px0 / TILE);
  const ty0 = Math.floor(py0 / TILE);
  const tx1 = Math.floor(px1 / TILE);
  const ty1 = Math.floor(py1 / TILE);
  const tilesX = tx1 - tx0 + 1;
  const tilesY = ty1 - ty0 + 1;
  if (tilesX > 6 || tilesY > 6) {
    throw new Error('terrain-bbox-too-large');
  }

  const tiles: (Float32Array | null)[] = [];
  const jobs: Promise<void>[] = [];
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const idx = (ty - ty0) * tilesX + (tx - tx0);
      jobs.push(
        decodeTile(z, tx, ty)
          .then((t) => {
            tiles[idx] = t;
          })
          .catch(() => {
            tiles[idx] = null;
          }),
      );
    }
  }
  await Promise.all(jobs);

  let gotAny = false;
  for (const t of tiles) if (t) gotAny = true;
  if (!gotAny) throw new Error('terrain-unavailable');

  const stitchedW = tilesX * TILE;
  const stitchedH = tilesY * TILE;

  // offset of the stitched image origin in world px
  const originX = tx0 * TILE;
  const originY = ty0 * TILE;

  const sampleAt = (wx: number, wy: number): number => {
    // bilinear sample in stitched pixel space
    const fx = wx - originX - 0.5;
    const fy = wy - originY - 0.5;
    const ix = Math.min(stitchedW - 2, Math.max(0, Math.floor(fx)));
    const iy = Math.min(stitchedH - 2, Math.max(0, Math.floor(fy)));
    const dx = Math.min(1, Math.max(0, fx - ix));
    const dy = Math.min(1, Math.max(0, fy - iy));
    const at = (px: number, py: number) => {
      // px/py are stitch-local coordinates (0..stitchedW/H)
      const txi = Math.floor(px / TILE);
      const tyi = Math.floor(py / TILE);
      if (txi < 0 || tyi < 0 || txi >= tilesX || tyi >= tilesY) return 0;
      const t = tiles[tyi * tilesX + txi];
      if (!t) return 0;
      return t[(py % TILE) * TILE + (px % TILE)];
    };
    const v00 = at(ix, iy);
    const v10 = at(ix + 1, iy);
    const v01 = at(ix, iy + 1);
    const v11 = at(ix + 1, iy + 1);
    return v00 * (1 - dx) * (1 - dy) + v10 * dx * (1 - dy) + v01 * (1 - dx) * dy + v11 * dx * dy;
  };

  const grid = new Float32Array(n * n);
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < n; j++) {
    const wy = py0 + (spanY * j) / (n - 1);
    for (let i = 0; i < n; i++) {
      const wx = px0 + (spanX * i) / (n - 1);
      const e = sampleAt(wx, wy);
      grid[j * n + i] = e;
      if (e < min) min = e;
      if (e > max) max = e;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error('terrain-unavailable');

  const markerPxX = mercX(lon, z);
  const markerPxY = mercY(lat, z);
  const markerU = (markerPxX - px0) / spanX;
  const markerV = (markerPxY - py0) / spanY;
  const pointElev = sampleAt(markerPxX, markerPxY);

  // ground width (metres) of the bbox at the centre latitude
  const spanMeters =
    ((bbox.lon1 - bbox.lon0) * Math.PI * EARTH_RADIUS_M * Math.cos((lat * Math.PI) / 180)) / 180;

  const terrain: Terrain = {
    grid,
    n,
    min,
    max,
    markerU: Math.min(1, Math.max(0, markerU)),
    markerV: Math.min(1, Math.max(0, markerV)),
    pointElev,
    spanMeters,
    zoom: z,
  };
  terrainCacheSet(cacheKey, terrain);
  return terrain;
}
