// lib/fulfill.ts
// The one place we hand a paid order off to Prodigi. Centralised so
// we have a single chokepoint to add retries, queueing, sanity
// checks, telemetry, idempotency, etc.

import { Prodigi, ProdigiRecipient } from "./prodigi";
import { OrderRecord, Storage } from "./storage";

export interface FulfillResult {
  ok: boolean;
  outcome: string;
  prodigiOrderId?: string;
  error?: string;
  httpStatus?: number;
}

export async function fulfillOrder(
  order: OrderRecord,
  deps: {
    prodigi: Prodigi;
    storage: Storage;
    appBaseUrl: string;
  }
): Promise<FulfillResult> {
  const { prodigi, storage, appBaseUrl } = deps;

  // Make sure we have a recipient.
  if (!order.recipient?.name || !order.recipient?.line1) {
    return {
      ok: false,
      outcome: "NoRecipient",
      error: "order has no shipping recipient",
    };
  }

  // Make sure we have an asset URL Prodigi can fetch.
  if (!order.assetUrl) {
    return {
      ok: false,
      outcome: "NoAsset",
      error: "order design asset is missing",
    };
  }

  const recipient: ProdigiRecipient = {
    name: order.recipient.name,
    ...(order.recipient.email ? { email: order.recipient.email } : {}),
    address: {
      line1: order.recipient.line1!,
      ...(order.recipient.line2 ? { line2: order.recipient.line2 } : {}),
      townOrCity: order.recipient.city || "Somewhere",
      ...(order.recipient.state ? { stateOrCounty: order.recipient.state } : {}),
      postalOrZipCode: order.recipient.postal || "00000",
      countryCode: (order.recipient.country || "US").toUpperCase(),
    },
  };

  try {
    const res = await prodigi.createOrder({
      shippingMethod: "Standard",
      size: order.design.garmentSize,
      color: order.design.garmentColor,
      copies: order.design.quantity,
      assetUrl: order.assetUrl,
      printArea: "front",
      recipient,
      merchantReference: order.id,
      recipientCost: { amount: "32.00", currency: "USD" },
      metadata: {
        orderId: order.id,
        designHash: order.designHash,
        place: order.design.placeName,
        date: order.design.dateIso,
      },
      callbackUrl: `${stripSlash(appBaseUrl)}/api/prodigi-callback?orderId=${encodeURIComponent(
        order.id
      )}`,
    });

    const prodigiOrderId =
      res.order?.id ??
      // Some sandbox responses put the id at top level
      (res as { id?: string }).id;

    const updated: OrderRecord = {
      ...order,
      status: res.outcome?.toLowerCase() === "created" ||
        res.outcome?.toLowerCase() === "createdwithissues"
        ? "submitted"
        : "paid",
      updatedAt: new Date().toISOString(),
      prodigi: {
        outcome: res.outcome,
        orderId: prodigiOrderId,
      },
    };
    await storage.writeOrder(updated);

    return { ok: true, outcome: res.outcome, prodigiOrderId };
  } catch (e) {
    const err = e as Error & { status?: number; response?: { outcome?: string } };
    const updated: OrderRecord = {
      ...order,
      status: "error",
      updatedAt: new Date().toISOString(),
      prodigi: {
        outcome: err.response?.outcome ?? "Error",
        error: err.message,
        httpStatus: err.status,
      },
    };
    await storage.writeOrder(updated);
    return {
      ok: false,
      outcome: err.response?.outcome ?? "Error",
      error: err.message,
      httpStatus: err.status,
    };
  }
}

function stripSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
