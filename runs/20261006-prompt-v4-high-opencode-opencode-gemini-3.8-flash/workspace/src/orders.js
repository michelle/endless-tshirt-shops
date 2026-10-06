import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, ensureDirs } from './config.js';

const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function readOrders() {
  ensureDirs();
  if (!fs.existsSync(ORDERS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeOrders(orders) {
  ensureDirs();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

export function getAllOrders() {
  const map = readOrders();
  return Object.values(map).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getOrder(sessionId) {
  const map = readOrders();
  return map[sessionId] || null;
}

export function saveOrder(order) {
  const map = readOrders();
  map[order.sessionId] = {
    ...map[order.sessionId],
    ...order,
    updatedAt: new Date().toISOString(),
  };
  writeOrders(map);
  return map[order.sessionId];
}
