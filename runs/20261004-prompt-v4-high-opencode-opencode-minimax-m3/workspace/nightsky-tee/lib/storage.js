// Tiny in-memory order store.
// Persists while the server is running. Production would swap this for
// a database — Postgres, Firestore, etc. — but for the demo it's fine.
//
// State shape:
//   Map<orderId, { id, merchantReference, stripeSessionId, createdAt, payload,
//                  status: 'awaiting_payment' | 'paid' | 'submitted' | 'failed',
//                  prodigiOrderId?, prodigiOutcome?, error? }>

class OrderStore {
  constructor() {
    this.orders = new Map();
  }

  create(payload) {
    const id = payload.id || crypto.randomUUID();
    const record = {
      id,
      createdAt: new Date().toISOString(),
      status: "awaiting_payment",
      ...payload
    };
    this.orders.set(id, record);
    return record;
  }

  // Looks up an order by Stripe session id (passed in metadata).
  findByStripeSession(sessionId) {
    for (const o of this.orders.values()) {
      if (o.stripeSessionId === sessionId) return o;
    }
    return null;
  }

  findByProdigiOrder(prodigiId) {
    for (const o of this.orders.values()) {
      if (o.prodigiOrderId === prodigiId) return o;
    }
    return null;
  }

  update(id, patch) {
    const o = this.orders.get(id);
    if (!o) return null;
    Object.assign(o, patch);
    return o;
  }

  get(id) {
    return this.orders.get(id) || null;
  }

  list() {
    return [...this.orders.values()].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
  }
}

export const orders = new OrderStore();
