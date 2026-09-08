import type Stripe from "stripe";
import { Design, designFromMetadata } from "./design";
import { fulfilSession } from "./fulfil";
import { getProdigiOrder, isSandbox, ProdigiOrder } from "./prodigi";
import { stripe } from "./stripe";

export interface OrderView {
  id: string;
  paymentStatus: Stripe.Checkout.Session.PaymentStatus;
  status: "unpaid" | "paid_pending_print" | "sent_to_print" | "in_production" | "shipped" | "cancelled";
  design: Design | null;
  quantity: number;
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  shippingName: string | null;
  shippingAddress: Stripe.Address | null;
  shippingMethod: string | null;
  prodigi: { id: string; stage: string; issues: string[]; tracking: Array<{ carrier?: string; number?: string; url?: string }> } | null;
  sandbox: boolean;
}

function stageToStatus(o: ProdigiOrder): OrderView["status"] {
  const stage = (o.status?.stage ?? "").toLowerCase();
  const d = o.status?.details ?? {};
  const started = (k: string) => d[k] === "InProgress" || d[k] === "Complete";
  if (stage === "complete" || started("shipping")) return "shipped";
  if (stage === "cancelled") return "cancelled";
  if (started("inProduction")) return "in_production";
  return "sent_to_print";
}

export async function getOrderView(sessionId: string): Promise<OrderView> {
  let session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["shipping_cost.shipping_rate"] });

  // Safety net: if the webhook has not fulfilled a paid session within two
  // minutes (e.g. webhook outage), fulfil it here. Same idempotency guards apply.
  if (session.payment_status === "paid" && !session.metadata?.prodigi_order_id && Date.now() / 1000 - session.created > 120) {
    try {
      await fulfilSession(session.id);
      session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["shipping_cost.shipping_rate"] });
    } catch (e) {
      console.error("fallback fulfilment failed", e);
    }
  }

  let design: Design | null = null;
  try {
    design = designFromMetadata(session.metadata);
  } catch {
    design = null;
  }

  let prodigi: OrderView["prodigi"] = null;
  let status: OrderView["status"] = session.payment_status === "paid" ? "paid_pending_print" : "unpaid";
  const prodigiId = session.metadata?.prodigi_order_id;
  if (prodigiId) {
    try {
      const o: ProdigiOrder = await getProdigiOrder(prodigiId);
      prodigi = {
        id: o.id,
        stage: o.status?.stage ?? "Unknown",
        issues: (o.status?.issues ?? []).map((i) => `${i.errorCode}: ${i.description}`),
        tracking: (o.shipments ?? []).map((s) => ({ carrier: s.carrier?.name, number: s.tracking?.number, url: s.tracking?.url })),
      };
      status = stageToStatus(o);
    } catch (e) {
      console.error("prodigi lookup failed", e);
      prodigi = { id: prodigiId, stage: "Unknown", issues: [], tracking: [] };
      status = "sent_to_print";
    }
  }

  const s = session as unknown as { collected_information?: { shipping_details?: { name?: string; address?: Stripe.Address } }; shipping_details?: { name?: string; address?: Stripe.Address } };
  const ship = s.collected_information?.shipping_details ?? s.shipping_details ?? null;
  const rate = session.shipping_cost?.shipping_rate;

  return {
    id: session.id,
    paymentStatus: session.payment_status,
    status,
    design,
    quantity: parseInt(session.metadata?.quantity ?? "1", 10) || 1,
    email: session.customer_details?.email ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    shippingName: ship?.name ?? null,
    shippingAddress: ship?.address ?? null,
    shippingMethod: typeof rate === "object" && rate ? rate.display_name : null,
    prodigi,
    sandbox: isSandbox(),
  };
}
