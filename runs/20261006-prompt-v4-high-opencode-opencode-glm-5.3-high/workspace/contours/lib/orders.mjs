// Tiny durable order store: a JSON file on disk, written atomically.
// Source of truth for money is Stripe (the session); for fulfilment it is
// Prodigi's idempotency key. This file is just for the status page.

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(process.cwd(), 'data/orders.json');
const TMP = FILE + '.tmp';
mkdirSync(path.dirname(FILE), { recursive: true });

let orders = {};
try { orders = JSON.parse(readFileSync(FILE, 'utf8')); } catch {}

function persist() {
  writeFileSync(TMP, JSON.stringify(orders, null, 1));
  renameSync(TMP, FILE);
}

export function upsertOrder(order) {
  orders[order.id] = order;
  persist();
  return order;
}

export function getOrder(id) {
  return orders[id];
}

export function getOrderByStripeSession(sessionId) {
  return Object.values(orders).find((o) => o.sessionId === sessionId);
}

export function recentOrders(limit = 50) {
  return Object.values(orders).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit);
}

export { existsSync };
