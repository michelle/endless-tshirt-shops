import fs from 'node:fs';
import path from 'node:path';
import { OrderRecord } from './types';

const STORE_PATH = path.join('/tmp', 'aethel_orders.json');
const memoryCache = new Map<string, OrderRecord>();

function readStore(): Record<string, OrderRecord> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    // Return empty if read fails
  }
  return {};
}

function writeStore(records: Record<string, OrderRecord>) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal in read-only environment
  }
}

export function saveOrder(order: OrderRecord): void {
  memoryCache.set(order.id, order);
  if (order.stripeSessionId) {
    memoryCache.set(order.stripeSessionId, order);
  }
  if (order.prodigiOrderId) {
    memoryCache.set(order.prodigiOrderId, order);
  }

  const all = readStore();
  all[order.id] = order;
  if (order.stripeSessionId) {
    all[order.stripeSessionId] = order;
  }
  if (order.prodigiOrderId) {
    all[order.prodigiOrderId] = order;
  }
  writeStore(all);
}

export function getOrder(idOrSessionId: string): OrderRecord | null {
  if (memoryCache.has(idOrSessionId)) {
    return memoryCache.get(idOrSessionId)!;
  }
  const all = readStore();
  return all[idOrSessionId] || null;
}
