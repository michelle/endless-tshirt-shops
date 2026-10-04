/**
 * Simple in-memory + filesystem order ledger.
 *
 * We persist each order-to-render PNG so Prodigi can fetch it later, plus
 * the user's design payload so we can render the SVG inside the success
 * page without re-asking the customer to re-enter.
 *
 * In production this would be Postgres/Redis/etc. A single-server Next.js
 * instance on Vercel with a /tmp/uploads folder is good enough to demo.
 */
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { DesignInput } from './design';

export interface StoredOrder {
  id: string;
  createdAt: string;
  designHash: string;     // SHA-256 of the SVG used for the print
  design: DesignInput;
  productSku: string;
  color: string;
  size: string;
  copies: number;
  recipient: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      line1: string;
      line2?: string;
      townOrCity: string;
      stateOrCounty?: string;
      postalOrZipCode: string;
      countryCode: string;
    };
  };
  unitPriceUsd: number;
  status: 'draft' | 'paid' | 'submitted_to_prodigi' | 'fulfilled' | 'failed';
  stripeSessionId?: string;
  prodigiOrderId?: string;
  error?: string;
  /** Absolute URL of the running app when the order was created; needed so
   *  background tasks (webhook, fulfillment) can build a public asset URL
   *  without re-deriving it from headers.  */
  baseUrl?: string;
}

// We persist orders to disk when UPLOAD_DIR is writable so /api/asset/...
// can keep serving the PNG across cold starts on Vercel.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), '.data');

// In-process cache to avoid disk hits in the common path.
const memoryOrders = new Map<string, StoredOrder>();

async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch {
    /* readonly fs - stay in memory */
  }
}

export async function storeOrder(order: StoredOrder): Promise<StoredOrder> {
  await ensureDir();
  memoryOrders.set(order.id, order);
  try {
    await fs.writeFile(path.join(UPLOAD_DIR, `${order.id}.json`), JSON.stringify(order), 'utf8');
  } catch {
    /* readonly - ok */
  }
  // Save the design hash so we don't re-render the same PNG twice.
  try {
    await fs.writeFile(path.join(UPLOAD_DIR, `${order.designHash}.png`), '', { flag: 'a' });
  } catch {
    /* ignore */
  }
  return order;
}

export async function getOrder(id: string): Promise<StoredOrder | null> {
  if (memoryOrders.has(id)) return memoryOrders.get(id)!;
  try {
    const raw = await fs.readFile(path.join(UPLOAD_DIR, `${id}.json`), 'utf8');
    const parsed = JSON.parse(raw) as StoredOrder;
    memoryOrders.set(id, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function updateOrder(id: string, patch: Partial<StoredOrder>): Promise<StoredOrder | null> {
  const existing = await getOrder(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  return storeOrder(merged);
}

export function newOrderId(): string {
  return 'sp_' + crypto.randomBytes(8).toString('hex');
}

export function hashDesign(svg: string): string {
  return crypto.createHash('sha256').update(svg).digest('hex').slice(0, 32);
}

export function assetDir(): string {
  return UPLOAD_DIR;
}
