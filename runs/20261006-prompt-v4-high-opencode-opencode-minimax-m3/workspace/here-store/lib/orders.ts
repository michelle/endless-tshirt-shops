import { v4 as uuidv4 } from 'uuid';
import type { OrderRecord, OrderStatus } from './types';

/**
 * Vercel serverless functions don't share global memory across instances,
 * so for a real deployment we'd use a KV/Postgres backend. For this demo
 * we keep it simple with an in-memory Map that ties orders to their
 * checkout session id. The crucial thing is that we DO write to the map
 * before Stripe proceeds, and we read it back inside the webhook.
 */
class Orders {
  private byId = new Map<string, OrderRecord>();
  private byStripeSession = new Map<string, string>();

  create(record: Omit<OrderRecord, 'id' | 'createdAt' | 'status' | 'idempotencyKey'> & { idempotencyKey?: string }): OrderRecord {
    const id = uuidv4();
    const full: OrderRecord = {
      ...record,
      id,
      createdAt: Date.now(),
      status: 'pending_payment' as OrderStatus,
      idempotencyKey: record.idempotencyKey ?? uuidv4(),
    };
    this.byId.set(id, full);
    if (record.stripeSessionId) {
      this.byStripeSession.set(record.stripeSessionId, id);
    }
    return full;
  }

  attachStripeSession(orderId: string, sessionId: string, paymentIntent?: string) {
    const o = this.byId.get(orderId);
    if (!o) return;
    o.stripeSessionId = sessionId;
    if (paymentIntent) o.stripePaymentIntentId = paymentIntent;
    this.byStripeSession.set(sessionId, orderId);
  }

  bySession(sessionId: string): OrderRecord | undefined {
    const id = this.byStripeSession.get(sessionId);
    if (!id) return undefined;
    return this.byId.get(id);
  }

  get(orderId: string): OrderRecord | undefined {
    return this.byId.get(orderId);
  }

  update(orderId: string, patch: Partial<OrderRecord>): OrderRecord | undefined {
    const o = this.byId.get(orderId);
    if (!o) return;
    Object.assign(o, patch);
    return o;
  }

  all(): OrderRecord[] {
    return [...this.byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  }
}

// Survive HMR by hanging on globalThis
const globalAny = globalThis as unknown as { __here_orders?: Orders };
export const orders = globalAny.__here_orders ?? new Orders();
if (!globalAny.__here_orders) globalAny.__here_orders = orders;
