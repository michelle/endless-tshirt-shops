'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

const DB_FILE = path.join(config.ROOT, 'data', 'orders.json');
let db = null;

function load() {
  if (db) return db;
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!db.orders) db.orders = {};
  } catch {
    db = { orders: {} };
  }
  return db;
}

let saveTimer = null;
function save() {
  // Atomic write; debounce to coalesce bursts (single-process demo store).
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const data = load();
    const tmp = DB_FILE + '.tmp';
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
    fs.renameSync(tmp, DB_FILE);
  }, 40);
}

function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const data = load();
  const tmp = DB_FILE + '.tmp';
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, DB_FILE);
}

function newOrderId() {
  return 'nl_' + crypto.randomBytes(8).toString('hex');
}

function createOrder(fields) {
  const o = Object.assign({
    id: newOrderId(),
    createdAt: new Date().toISOString(),
    events: [],
  }, fields);
  o.payment = Object.assign({ provider: null, status: 'pending', reference: null, paidAt: null }, o.payment);
  o.fulfillment = Object.assign({ status: 'none', prodigiOrderId: null, outcome: null, error: null, assetUrl: null, sentAt: null, attempts: 0 }, o.fulfillment);
  load().orders[o.id] = o;
  event(o, 'created');
  save();
  return o;
}

function getOrder(id) {
  return load().orders[id] || null;
}

function event(order, type, info) {
  order.events.push({ at: new Date().toISOString(), type, info: info || null });
  if (order.events.length > 200) order.events.splice(0, order.events.length - 200);
}

function touch(order) { save(); }

module.exports = { createOrder, getOrder, event, touch, save, saveNow, newOrderId };
