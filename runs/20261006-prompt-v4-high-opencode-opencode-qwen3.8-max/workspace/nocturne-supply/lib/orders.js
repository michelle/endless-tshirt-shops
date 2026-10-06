// File-backed order store (orders/<id>.json). Simple, dependency-free, and
// adequate for a single-instance demo; swap for a database in production.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ORDERS_DIR = path.join(__dirname, '..', 'orders');
fs.mkdirSync(ORDERS_DIR, { recursive: true });

function orderId() {
  return 'noc_' + crypto.randomBytes(6).toString('hex');
}

function save(order) {
  order.updated = new Date().toISOString();
  fs.writeFileSync(path.join(ORDERS_DIR, `${order.id}.json`), JSON.stringify(order, null, 2));
  return order;
}

function load(id) {
  if (!/^noc_[a-f0-9]{12}$/.test(id || '')) return null;
  const p = path.join(ORDERS_DIR, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

function list() {
  return fs
    .readdirSync(ORDERS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(ORDERS_DIR, f), 'utf8'));
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.created < b.created ? 1 : -1));
}

function appendHistory(order, event, detail) {
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ at: new Date().toISOString(), event, detail: detail ?? null });
  return order;
}

module.exports = { orderId, save, load, list, appendHistory };
