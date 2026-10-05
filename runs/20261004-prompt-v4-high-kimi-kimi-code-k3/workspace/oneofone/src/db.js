'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ORDERS_DIR = path.join(DATA_DIR, 'orders');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const DESIGNS_PATH = path.join(DATA_DIR, 'designs.json');

for (const d of [DATA_DIR, ORDERS_DIR]) fs.mkdirSync(d, { recursive: true });

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(p, obj) {
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
}

function getConfig() {
  return readJson(CONFIG_PATH, {});
}

function saveConfig(cfg) {
  writeJson(CONFIG_PATH, cfg);
}

function newOrderId() {
  return crypto.randomBytes(10).toString('hex'); // 20 chars, PayU-safe
}

function createOrder(order) {
  writeJson(path.join(ORDERS_DIR, order.id + '.json'), order);
  return order;
}

function getOrder(id) {
  if (!/^[a-f0-9]{20}$/.test(id)) return null;
  return readJson(path.join(ORDERS_DIR, id + '.json'), null);
}

function saveOrder(order) {
  writeJson(path.join(ORDERS_DIR, order.id + '.json'), order);
}

function getDesigns() {
  return readJson(DESIGNS_PATH, {});
}

function registerDesign(id, info) {
  const designs = getDesigns();
  if (!designs[id]) {
    designs[id] = info;
    writeJson(DESIGNS_PATH, designs);
  }
}

module.exports = { getConfig, saveConfig, newOrderId, createOrder, getOrder, saveOrder, getDesigns, registerDesign };
