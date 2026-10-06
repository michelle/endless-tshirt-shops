// Terrarium elevation tiles (AWS Open Data, free, no key) → elevation grid.
// https://registry.opendata.aws/terrain-tiles/

import { PNG } from 'pngjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildTerrain } from './contours.mjs';

const TILE = 256;
const TILE_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const TILE_DIR = path.resolve(process.cwd(), 'data/tiles');
mkdirSync(TILE_DIR, { recursive: true });

const φ = (deg) => (deg * Math.PI) / 180;
const lngToTileX = (lng, z) => ((lng + 180) / 360) * 2 ** z;
const latToTileY = (lat, z) => {
  const t = Math.tan(φ(lat)) + 1 / Math.cos(φ(lat));
  return ((1 - Math.log(t) / Math.PI) / 2) * 2 ** z;
};
const mpp = (lat, z) => (40075016.686 * Math.cos(φ(lat))) / (2 ** z * TILE);

function pickZoom(lat, extentM) {
  let z = 15;
  while (z > 6 && extentM / mpp(lat, z) > 1100) z--;
  while (z < 15 && extentM / mpp(lat, z) < 550) z++;
  return z;
}

async function fetchTile(z, x, y) {
  const wrap = 2 ** z;
  const xu = ((Math.round(x) % wrap) + wrap) % wrap;
  if (Math.round(y) < 0 || Math.round(y) >= wrap) return null;
  const file = path.join(TILE_DIR, `${z}_${xu}_${y}.png`);
  let buf;
  try {
    buf = readFileSync(file);
  } catch {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(TILE_URL(z, xu, y), { signal: AbortSignal.timeout(20000) });
        if (!res.ok) throw new Error(`tile ${res.status}`);
        buf = Buffer.from(await res.arrayBuffer());
        try { writeFileSync(file, buf); } catch {}
        break;
      } catch (e) {
        if (attempt === 2) console.error(`tile fetch failed z${z} ${xu}/${y}:`, e.message);
      }
    }
  }
  if (!buf) return null;
  try {
    const png = PNG.sync.read(buf);
    const out = new Float32Array(TILE * TILE);
    const d = png.data;
    for (let i = 0; i < TILE * TILE; i++) {
      out[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
    }
    return out;
  } catch (e) {
    console.error('tile decode failed:', e.message);
    return null;
  }
}

const terrainCache = new Map(); // key → terrain promise

export function getTerrain(lat, lng, extentKm) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('coordinates required');
  if (lat < -84 || lat > 84) throw new Error('too close to the pole for these maps — pick a place below ±84° latitude');
  if (!(extentKm > 0) || extentKm > 60) throw new Error('bad extent');
  const key = `${lat.toFixed(4)}:${lng.toFixed(4)}:${extentKm}`;
  if (terrainCache.has(key)) return terrainCache.get(key);
  const p = buildTerrainUncached(lat, lng, extentKm).catch((e) => {
    terrainCache.delete(key);
    throw e;
  });
  terrainCache.set(key, p);
  return p;
}

async function buildTerrainUncached(lat, lng, extentKm) {
  const extentM = extentKm * 1000;
  const z = pickZoom(lat, extentM);
  const windowPx = extentM / mpp(lat, z); // square window
  const cx = lngToTileX(lng, z) * TILE;
  const cy = latToTileY(lat, z) * TILE;
  const margin = 2;
  const x0 = cx - windowPx / 2 - margin;
  const y0 = cy - windowPx / 2 - margin;
  const x1 = cx + windowPx / 2 + margin;
  const y1 = cy + windowPx / 2 + margin;
  const tx0 = Math.floor(x0 / TILE), tx1 = Math.floor((x1 - 0.001) / TILE);
  const ty0 = Math.floor(y0 / TILE), ty1 = Math.floor((y1 - 0.001) / TILE);
  if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) > 36) throw new Error('window too large');

  const w = Math.round(x1 - x0);
  const h = Math.round(y1 - y0);
  const grid = new Float32Array(w * h).fill(NaN);

  const jobs = [];
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      jobs.push(
        fetchTile(z, tx, ty).then((tile) => {
          if (!tile) return;
          const gx0 = Math.round(tx * TILE - x0);
          const gy0 = Math.round(ty * TILE - y0);
          for (let y = 0; y < TILE; y++) {
            const gy = gy0 + y;
            if (gy < 0 || gy >= h) continue;
            for (let x = 0; x < TILE; x++) {
              const gx = gx0 + x;
              if (gx < 0 || gx >= w) continue;
              grid[gy * w + gx] = tile[y * TILE + x];
            }
          }
        })
      );
    }
  }
  await Promise.all(jobs);

  let finite = 0;
  for (let i = 0; i < grid.length; i++) if (Number.isFinite(grid[i])) finite++;
  if (finite < grid.length * 0.05) throw new Error('no elevation data for this spot — try a slightly different location');

  const win = { x0: 0, y0: 0, x1: w, y1: h };
  return buildTerrain(grid, w, h, win, extentKm);
}
