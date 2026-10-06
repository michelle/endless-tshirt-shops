// Tiny JSON-file store. Good enough for a single-process pilot; swap for
// Postgres/SQLite before production (see README).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, '../data');
export const PRINTS_DIR = path.join(DATA_DIR, 'prints');
const DB_PATH = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(PRINTS_DIR, { recursive: true });

let db;
try {
  db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
} catch {
  db = { designs: {}, orders: {} };
}
db.designs ||= {};
db.orders ||= {};

function save() {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_PATH);
}

export const store = {
  putDesign(id, design) {
    db.designs[id] = { id, design, createdAt: new Date().toISOString() };
    save();
    return db.designs[id];
  },
  getDesign(id) {
    return db.designs[id] || null;
  },
  putOrder(order) {
    db.orders[order.id] = order;
    save();
    return order;
  },
  getOrder(id) {
    return db.orders[id] || null;
  },
  updateOrder(id, patch) {
    if (!db.orders[id]) return null;
    Object.assign(db.orders[id], patch, { updatedAt: new Date().toISOString() });
    save();
    return db.orders[id];
  },
  findOrderBySession(sessionId) {
    return Object.values(db.orders).find((o) => o.stripeSessionId === sessionId) || null;
  },
  findOrderByProdigiId(prodigiOrderId) {
    return Object.values(db.orders).find((o) => o.prodigiOrderId === prodigiOrderId) || null;
  },
  listOrders() {
    return Object.values(db.orders).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
};
