// lib/storage.js
// Persistent file-backed order store.

import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve("./data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadOrders() {
  ensureDir();
  if (!fs.existsSync(ORDERS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  } catch (e) {
    return {};
  }
}

export function saveOrders(orders) {
  ensureDir();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
}

export function getOrder(id) {
  const orders = loadOrders();
  return orders[id] || null;
}

export function setOrder(id, data) {
  const orders = loadOrders();
  orders[id] = {
    ...orders[id],
    ...data,
    updatedAt: new Date().toISOString()
  };
  saveOrders(orders);
  return orders[id];
}

export function findOrderBySessionOrPayment(stripeId) {
  const orders = loadOrders();
  for (const order of Object.values(orders)) {
    if (order.stripeSessionId === stripeId || order.stripePaymentIntentId === stripeId || order.id === stripeId) {
      return order;
    }
  }
  return null;
}
