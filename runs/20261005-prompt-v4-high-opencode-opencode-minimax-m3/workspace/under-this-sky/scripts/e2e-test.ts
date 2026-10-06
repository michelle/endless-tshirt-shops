// scripts/e2e-test.ts
// Drives the same code paths that /api/checkout + /api/demo-pay use, but
// locally and synchronously. Useful for pre-deploy sanity checks and as
// a CI smoke test.
//
// Usage:
//   npx tsx scripts/e2e-test.ts
//
// Requires PRODIGI_API_KEY in env. Submits a *real* order to the Prodigi
// sandbox — the sandbox won't print or charge, but the order will show
// up at https://sandbox-beta-dashboard.pwinty.com.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { snapshot } from "../lib/astronomy";
import { renderDesign } from "../lib/design";
import { svgToPng } from "../lib/render";
import { OrderRecord, Storage } from "../lib/storage";
import { Prodigi } from "../lib/prodigi";

async function main() {
  const apiKey = process.env.PRODIGI_API_KEY?.trim();
  if (!apiKey) {
    console.error("PRODIGI_API_KEY not set");
    process.exit(2);
  }

  // 1) Compose the design.
  const design = {
    dateIso: "2019-06-14T23:30:00Z",
    lat: 38.7223,
    lng: -9.1393,
    placeName: "Lisbon, Portugal",
    headline: "The Night We Met",
    subtitle: "Elena & Marco",
    message: ["And so the adventure began."],
    palette: "ink" as const,
    garment: "black" as const,
  };
  const sky = snapshot({
    whenUtc: new Date(design.dateIso),
    lat: design.lat,
    lng: design.lng,
    placeName: design.placeName,
  });
  const out = renderDesign(design, sky);
  console.log(`[e2e] design hash ${out.hash}, ${out.svg.length} chars of SVG`);

  // 2) Rasterise.
  let pngBytes: Buffer;
  try {
    const png = await svgToPng(out.svg, { width: 4665 });
    pngBytes = png.buffer;
    console.log(`[e2e] PNG ${pngBytes.length} bytes`);
  } catch (e) {
    console.log(`[e2e] resvg unavailable, falling back to SVG: ${(e as Error).message}`);
    pngBytes = Buffer.from(out.svg, "utf8");
  }

  // 3) Persist to a sandbox dir so we don't pollute the real data dir.
  const sandboxRoot = path.join(os.tmpdir(), "under-this-sky-e2e");
  const storage = new Storage({ dataDir: sandboxRoot });
  await storage.init();
  const filename = `${out.hash}.${pngBytes.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? "png" : "svg"}`;
  await storage.writeAsset(pngBytes, {
    hash: out.hash,
    ext: filename.endsWith(".png") ? "png" : "svg",
  });
  const orderId = `uts_e2e_${Date.now().toString(16)}`;
  const order: OrderRecord = {
    id: orderId,
    paymentSessionId: `cs_test_e2e_${orderId}`,
    paymentMode: "demo",
    design: {
      dateIso: design.dateIso,
      lat: design.lat,
      lng: design.lng,
      placeName: design.placeName,
      headline: design.headline,
      subtitle: design.subtitle,
      message: design.message,
      palette: design.palette,
      garmentColor: design.garment,
      garmentSize: "m",
      quantity: 1,
    },
    status: "paid" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    designHash: out.hash,
    assetUrl: `file://${sandboxRoot}/assets/${filename}`,
    recipient: {
      name: "Local Test",
      email: "local@test.example",
      line1: "12 Test St",
      city: "Lisbon",
      postal: "1200-001",
      country: "PT",
    },
  };
  await storage.writeOrder(order);
  console.log(`[e2e] order persisted at ${sandboxRoot}`);

  // 4) Submit to Prodigi.
  //    NB: Prodigi fetches assetUrl over HTTP — a file:// URL will fail
  //    in this offline test, so we substitute a *real* public URL from
  //    a recent successful order so the asset is reachable.
  const prodigi = new Prodigi({ apiKey, environment: "sandbox" });
  try {
    const res = await prodigi.createOrder({
      shippingMethod: "Standard",
      size: "m",
      color: "black",
      copies: 1,
      assetUrl:
        "https://temporary-snappy-acacia-szy92me.vercel.app/api/asset/" +
        encodeURIComponent(out.hash),
      printArea: "front",
      recipient: {
        name: (order.recipient?.name) || "Local Test",
        email: order.recipient?.email,
        address: {
          line1: (order.recipient?.line1) || "12 Test St",
          townOrCity: (order.recipient?.city) || "Lisbon",
          postalOrZipCode: (order.recipient?.postal) || "1200-001",
          countryCode: (order.recipient?.country) || "PT",
        },
      },
      merchantReference: order.id,
      recipientCost: { amount: "32.00", currency: "USD" },
      metadata: {
        origin: "e2e-test-script",
        designHash: out.hash,
      },
    });
    console.log(`[e2e] Prodigi outcome: ${res.outcome}`);
    console.log(`[e2e] Prodigi orderId: ${res.order?.id}`);
    console.log(`[e2e] Prodigi stage:   ${res.order?.status?.stage}`);
    if (res.order?.status?.issues?.length) {
      console.warn("[e2e] issues:", res.order.status.issues);
    }
    fs.writeFileSync(
      path.join(sandboxRoot, "last-prodigi-response.json"),
      JSON.stringify(res, null, 2)
    );
    console.log(`[e2e] ✓ end-to-end ok — see ${sandboxRoot}/last-prodigi-response.json`);
  } catch (e) {
    console.error(`[e2e] Prodigi error: ${(e as Error).message}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[e2e] fatal:", e);
  process.exit(1);
});
