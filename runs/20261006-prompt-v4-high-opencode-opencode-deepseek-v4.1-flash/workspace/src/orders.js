// Tiny JSON-file order store. Enough for a demo store and keeps fulfillment
// idempotent across server restarts.

import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, ensureDirs } from './config.js';

const FILE = path.join(DATA_DIR, 'orders.json');
let cache = null;

function load() {
  if (cache) return cache;
  ensureDirs();
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    cache = {};
  }
  return cache;
}

function persist() {
  ensureDirs();
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, FILE);
}

export function getOrder(id) {
  return load()[id] || null;
}

export function listOrders() {
  return Object.values(load()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function upsertOrder(id, patch) {
  const store = load();
  const prev = store[id] || { id, createdAt: Date.now() };
  store[id] = { ...prev, ...patch, id, updatedAt: Date.now() };
  persist();
  return store[id];
}
