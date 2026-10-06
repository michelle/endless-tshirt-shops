// Tiny JSON-file-backed order store. Fine for a demo; swap for a real DB in production.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const DATA_DIR = "data";
const ORDERS_FILE = `${DATA_DIR}/orders.json`;
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

let orders = [];
if (existsSync(ORDERS_FILE)) {
  try {
    orders = JSON.parse(readFileSync(ORDERS_FILE, "utf8"));
  } catch (e) {
    console.error("orders.json unreadable, starting fresh:", e.message);
    orders = [];
  }
}

function persist() {
  const tmp = `${ORDERS_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(orders, null, 1));
  writeFileSync(ORDERS_FILE, readFileSync(tmp)); // poor man's atomic-ish write
}

export function createOrder(record) {
  const order = {
    id: `sl_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    createdAt: new Date().toISOString(),
    status: "pending_payment", // pending_payment -> paid -> fulfilling -> complete | failed
    events: [{ at: new Date().toISOString(), type: "order_created" }],
    ...record,
  };
  orders.unshift(order);
  persist();
  return order;
}

export function getOrder(id) {
  return orders.find((o) => o.id === id) || null;
}

export function updateOrder(id, patch, event) {
  const order = getOrder(id);
  if (!order) return null;
  Object.assign(order, patch);
  if (event) order.events.push({ at: new Date().toISOString(), ...event });
  persist();
  return order;
}

export function listOrders() {
  return orders;
}
