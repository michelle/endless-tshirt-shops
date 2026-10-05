// test-e2e.mjs
// Automated End-to-End Test for Celestia T-Shirt Store:
// 1. Tests API preview rendering.
// 2. Creates a paid Stripe order.
// 3. Verifies Prodigi order creation and asset ingestion.

import fs from "node:fs";

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const PRODIGI_API_KEY = process.env.PRODIGI_API_KEY;

console.log("=== Celestia End-to-End Test ===");
console.log(`Target: ${PUBLIC_URL}`);

async function run() {
  // 1. Test Health
  console.log("1. Checking server health...");
  const healthRes = await fetch(`${PUBLIC_URL}/api/health`);
  const health = await healthRes.json();
  console.log("Health OK:", health);

  // 2. Test Preview
  console.log("2. Testing live preview generation...");
  const prevRes = await fetch(`${PUBLIC_URL}/api/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2024-10-04T21:00:00Z",
      lat: 40.7128,
      lon: -74.0060,
      whereLabel: "New York, USA",
      messageTitle: "THE NIGHT WE MET",
      messageSub: "Underneath the autumn sky",
      shirtColor: "black"
    })
  });
  const preview = await prevRes.json();
  console.log("Preview SVG generated, length:", preview.svg?.length);

  // 3. Test Paid Order & Prodigi Fulfillment
  console.log("3. Executing test payment & fulfillment to Prodigi...");
  const orderRes = await fetch(`${PUBLIC_URL}/api/direct-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2024-10-04T21:00:00Z",
      lat: 40.7128,
      lon: -74.0060,
      whereLabel: "New York, USA",
      messageTitle: "THE NIGHT WE MET",
      messageSub: "Underneath the autumn sky",
      shirtColor: "black",
      shirtSize: "l",
      paymentMethod: "pm_card_visa",
      recipient: {
        name: "Celestia E2E Test Buyer",
        email: "buyer@celestia-tees.example",
        phoneNumber: null,
        address: {
          line1: "350 5th Ave",
          line2: null,
          townOrCity: "New York",
          stateOrCounty: "NY",
          postalOrZipCode: "10118",
          countryCode: "US"
        }
      }
    })
  });

  const orderData = await orderRes.json();
  console.log("Checkout response:", orderData);

  if (!orderData.success || !orderData.prodigiOrder?.id) {
    throw new Error(`Order placement failed: ${JSON.stringify(orderData)}`);
  }

  const prodigiOrderId = orderData.prodigiOrder.id;
  console.log(`Prodigi Order created: ${prodigiOrderId}`);

  // 4. Verify Prodigi Asset Ingestion
  console.log("4. Polling Prodigi for asset download completion...");
  let assetStatus = "NotStarted";
  for (let attempt = 1; attempt <= 15; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const pRes = await fetch(`https://api.sandbox.prodigi.com/v4.0/orders/${prodigiOrderId}`, {
      headers: { "X-API-Key": PRODIGI_API_KEY }
    });
    const pData = await pRes.json();
    assetStatus = pData.order?.status?.details?.downloadAssets;
    console.log(`  [Attempt ${attempt}/15] Prodigi asset download status: ${assetStatus}`);
    if (assetStatus === "Complete") {
      console.log("✅ Prodigi successfully downloaded the print artwork!");
      console.log("Item status:", pData.order?.items?.[0]?.status);
      console.log("Artwork asset status:", pData.order?.items?.[0]?.assets?.[0]?.status);
      console.log("MD5 hash:", pData.order?.items?.[0]?.assets?.[0]?.md5Hash);
      break;
    }
  }

  console.log("=== End-to-End Test Complete ===");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
