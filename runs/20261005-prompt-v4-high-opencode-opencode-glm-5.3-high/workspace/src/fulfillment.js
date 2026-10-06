// Fulfilment: runs ONLY after payment succeeds.
// 1. generate the 300-dpi print file  2. host it publicly  3. submit the
// order to Prodigi with an md5 hash so the print file is integrity-checked.
import { writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { renderFor } from "./artwork.js";
import { createProdigiOrder } from "./prodigi.js";
import { updateOrder } from "./orders.js";
import { STORE } from "./env.js";

const PRINT_DIR = "data/print-files";
mkdirSync(PRINT_DIR, { recursive: true });

export function publicBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  const proto = req?.headers["x-forwarded-proto"] || req?.protocol || "http";
  const host = req?.headers["x-forwarded-host"] || req?.headers.host || `localhost:3000`;
  return `${proto}://${host}`;
}

export async function fulfillOrder(order, req) {
  if (order.status === "fulfilling" || order.status === "complete") return order;
  try {
    const art = renderFor(order);
    const uuid = randomUUID();
    writeFileSync(`${PRINT_DIR}/${uuid}.png`, art.png);
    writeFileSync(`${PRINT_DIR}/${uuid}-preview.png`, art.preview);

    const baseUrl = publicBaseUrl(req);
    const printFileUrl = `${baseUrl}/print-files/${uuid}.png`;

    const recipient = {
      name: order.recipient.name,
      email: order.recipient.email || undefined,
      phoneNumber: order.recipient.phone || undefined,
      address: {
        line1: order.recipient.line1,
        line2: order.recipient.line2 || undefined,
        townOrCity: order.recipient.city,
        stateOrCounty: order.recipient.state || undefined,
        postalOrZipCode: order.recipient.zip,
        countryCode: order.recipient.country,
      },
    };

    const res = await createProdigiOrder({
      merchantReference: order.id,
      recipient,
      attributes: { color: order.product.color, size: order.product.size },
      printFileUrl,
      md5: art.md5,
      recipientCost: order.amounts.total,
      metadata: {
        design: {
          place: order.design.place,
          local: `${order.design.dateStr} ${order.design.timeStr} (${order.design.tz})`,
          lat: order.design.lat,
          lon: order.design.lon,
        },
        printFile: { width: art.width, height: art.height, md5: art.md5 },
        storefront: baseUrl,
      },
    });

    const stage = res?.order?.status?.stage ?? "InProgress";
    const issues = res?.order?.status?.issues ?? [];
    return updateOrder(
      order.id,
      {
        status: "fulfilling",
        printFile: { uuid, md5: art.md5, url: printFileUrl, width: art.width, height: art.height },
        prodigi: {
          orderId: res?.order?.id,
          outcome: res?.outcome,
          stage,
          issues,
          lastChecked: new Date().toISOString(),
        },
      },
      { type: "fulfillment_submitted", prodigiOrderId: res?.order?.id, outcome: res?.outcome, stage }
    );
  } catch (err) {
    console.error(`[fulfill] order ${order.id} failed:`, err.message);
    return updateOrder(
      order.id,
      { status: "paid_fulfillment_failed", fulfillmentError: err.message },
      { type: "fulfillment_error", error: err.message }
    );
  }
}
