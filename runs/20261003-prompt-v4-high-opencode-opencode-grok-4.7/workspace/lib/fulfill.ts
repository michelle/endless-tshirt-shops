import type { DesignSpec } from "./catalog";
import { SHIRT_CENTS } from "./catalog";
import { createOrder, getOrder } from "./prodigi";
import { stripe } from "./stripe";
import { signDesign } from "./token";
import { parseDesign, parseQty, parseShip, parseShipMethod } from "./validate";

export function originFrom(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (!host) throw new Error("Missing host");
  return `${proto}://${host}`;
}

function specFromMetadata(meta: Record<string, string>): DesignSpec {
  return parseDesign({
    name1: meta.name1,
    name2: meta.name2,
    date: meta.date,
    time: meta.time,
    approximate: meta.approximate === "1",
    place: meta.place,
    region: meta.region,
    lat: meta.lat,
    lon: meta.lon,
    tz: meta.tz,
    line: meta.line,
    color: meta.color,
    size: meta.size,
  });
}

export async function fulfillSession(sessionId: string, origin: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return { paid: false as const, status: session.status };
  }
  const meta = session.metadata || {};
  if (meta.prodigiOrderId) {
    const existing = await getOrder(meta.prodigiOrderId).catch(() => null);
    return {
      paid: true as const,
      prodigiOrderId: meta.prodigiOrderId,
      stage: existing?.stage || meta.prodigiStage || "InProgress",
      alreadyExisted: true,
      issues: existing?.issues || [],
    };
  }

  const spec = specFromMetadata(meta);
  const ship = parseShip({
    name: meta.shipName,
    email: meta.email,
    phone: meta.phone,
    line1: meta.line1,
    line2: meta.line2,
    city: meta.city,
    state: meta.state,
    zip: meta.zip,
    country: meta.country,
  });
  const qty = parseQty(meta.qty);
  const method = parseShipMethod(meta.shipMethod);
  const token = signDesign(spec);
  const assetUrl = `${origin}/api/print/${token}.png`;

  const order = await createOrder({
    idempotencyKey: session.id,
    merchantReference: session.id,
    shippingMethod: method,
    recipient: ship,
    color: spec.color,
    size: spec.size,
    copies: qty,
    assetUrl,
    recipientCost: ((SHIRT_CENTS * qty) / 100).toFixed(2),
  });

  await stripe().checkout.sessions.update(session.id, {
    metadata: { prodigiOrderId: order.id, prodigiStage: order.stage },
  }).catch(() => undefined);

  return {
    paid: true as const,
    prodigiOrderId: order.id,
    stage: order.stage,
    alreadyExisted: order.alreadyExisted,
    issues: [],
  };
}
