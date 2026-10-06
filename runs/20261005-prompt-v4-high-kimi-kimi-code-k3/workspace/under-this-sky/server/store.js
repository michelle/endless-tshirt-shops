// Tiny JSON-file order store (demo-grade persistence).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const FILE = new URL('../data/orders.json', import.meta.url);

let cache = null;
function load() {
  if (cache) return cache;
  try { cache = JSON.parse(readFileSync(FILE, 'utf8')); }
  catch { cache = {}; }
  return cache;
}
function save() {
  mkdirSync(dirname(FILE.pathname), { recursive: true });
  writeFileSync(FILE, JSON.stringify(cache, null, 2));
}

export function putOrder(sessionId, record) {
  load()[sessionId] = { ...record, updatedAt: new Date().toISOString() };
  save();
}
export function getOrder(sessionId) {
  return load()[sessionId] || null;
}
