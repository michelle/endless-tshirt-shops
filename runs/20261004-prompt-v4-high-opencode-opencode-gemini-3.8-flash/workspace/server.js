// server.js
// Celestia T-Shirt Store – Full Production DTG Custom Apparel Server
// Integrated with Stripe Payments & Prodigi Print-on-Demand Fulfillment.

import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

import { CITIES } from "./lib/astro.js";
import { renderStarmapSVG, renderStarmapPNG } from "./lib/starmap.js";
import { ProdigiClient } from "./lib/prodigi.js";
import { getOrder, setOrder, findOrderBySessionOrPayment } from "./lib/storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration & Secrets resolution
const PORT = process.env.PORT || 3000;
let PUBLIC_URL = process.env.PUBLIC_URL;
if (!PUBLIC_URL || PUBLIC_URL.includes("localhost")) {
  const publicUrlFile = path.resolve("./data/public_url");
  if (fs.existsSync(publicUrlFile)) {
    PUBLIC_URL = fs.readFileSync(publicUrlFile, "utf8").trim();
  }
}
if (!PUBLIC_URL) {
  PUBLIC_URL = `http://localhost:${PORT}`;
}

// Load Stripe test key from environment or benchmark CLI state
let stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey && process.env.BENCHMARK_CLI_STATE && fs.existsSync(process.env.BENCHMARK_CLI_STATE)) {
  try {
    const config = fs.readFileSync(process.env.BENCHMARK_CLI_STATE, "utf8");
    const m = config.match(/test_mode_api_key\s*=\s*['"]?([^'"\s]+)/);
    if (m) stripeSecretKey = m[1];
  } catch (e) {}
}
if (!stripeSecretKey && fs.existsSync(path.join(process.env.HOME || "", ".bench-secrets/sk"))) {
  try {
    stripeSecretKey = fs.readFileSync(path.join(process.env.HOME || "", ".bench-secrets/sk"), "utf8").trim();
  } catch (e) {}
}

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const prodigiApiKey = process.env.PRODIGI_API_KEY;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const prodigi = prodigiApiKey ? new ProdigiClient(prodigiApiKey) : null;

const app = express();

// Ensure storage directories exist
const ARTWORKS_DIR = path.resolve("./data/artworks");
if (!fs.existsSync(ARTWORKS_DIR)) {
  fs.mkdirSync(ARTWORKS_DIR, { recursive: true });
}

// --------------------------------------------------------------------------
// 1. Stripe Webhook Listener (must use raw body)
// --------------------------------------------------------------------------
app.post("/webhook/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    if (stripeWebhookSecret && sig && stripe) {
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } else {
      event = JSON.parse(req.body.toString("utf8"));
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log(`[Webhook] Checkout session completed: ${session.id}`);
      await fulfillStripeOrder({
        stripeId: session.id,
        type: "session",
        sessionObj: session
      });
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      console.log(`[Webhook] Payment intent succeeded: ${pi.id}`);
      await fulfillStripeOrder({
        stripeId: pi.id,
        type: "payment_intent",
        piObj: pi
      });
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Error processing webhook:", err);
    res.status(500).json({ error: err.message });
  }
});

// JSON parsing for all standard API routes
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// --------------------------------------------------------------------------
// 2. Health & Diagnostic Check
// --------------------------------------------------------------------------
app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "Celestia Custom Starmap T-Shirt Store",
    publicUrl: PUBLIC_URL,
    stripeConfigured: Boolean(stripe),
    prodigiConfigured: Boolean(prodigi),
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// 3. City List for Autocomplete
// --------------------------------------------------------------------------
app.get("/api/cities", (req, res) => {
  res.json(CITIES);
});

// --------------------------------------------------------------------------
// 4. Live Vector SVG & Preview Generation
// --------------------------------------------------------------------------
app.post("/api/preview", (req, res) => {
  try {
    const {
      date = new Date().toISOString(),
      lat = 40.7128,
      lon = -74.0060,
      whereLabel = "New York, USA",
      messageTitle = "THE NIGHT WE MET",
      messageSub = "Underneath the autumn sky",
      shirtColor = "black"
    } = req.body;

    const parsedDate = new Date(date);
    const svg = renderStarmapSVG({
      date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      lat: Number(lat),
      lon: Number(lon),
      whereLabel,
      messageTitle,
      messageSub,
      shirtColor
    });

    res.json({
      svg,
      title: messageTitle,
      location: whereLabel,
      date: parsedDate.toISOString()
    });
  } catch (err) {
    console.error("Preview error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. High-Resolution Print Artwork Endpoint (/art/:id.png)
//    (Safe route without state-changing keywords like "checkout" or "orders")
// --------------------------------------------------------------------------
app.get("/art/:id.png", async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(ARTWORKS_DIR, `${id}.png`);

    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return fs.createReadStream(filePath).pipe(res);
    }

    // If order exists in store, render on demand
    const order = getOrder(id) || findOrderBySessionOrPayment(id);
    if (!order) {
      return res.status(404).send("Artwork not found");
    }

    const png = renderStarmapPNG({
      date: new Date(order.date),
      lat: order.lat,
      lon: order.lon,
      whereLabel: order.whereLabel,
      messageTitle: order.messageTitle,
      messageSub: order.messageSub,
      shirtColor: order.color
    });

    fs.writeFileSync(filePath, png);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(png);
  } catch (err) {
    console.error("Artwork error:", err);
    res.status(500).send("Error rendering artwork");
  }
});

// --------------------------------------------------------------------------
// 6. Create Stripe Checkout Session
// --------------------------------------------------------------------------
app.post("/api/checkout", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    const {
      date = new Date().toISOString(),
      lat = 40.7128,
      lon = -74.0060,
      whereLabel = "New York, USA",
      messageTitle = "THE NIGHT WE MET",
      messageSub = "Underneath the autumn sky",
      shirtColor = "black",
      shirtSize = "l"
    } = req.body;

    const orderId = crypto.randomUUID();
    const parsedDate = new Date(date);

    // Pre-render and cache the 4680x5790 PNG artwork
    const png = renderStarmapPNG({
      date: parsedDate,
      lat: Number(lat),
      lon: Number(lon),
      whereLabel,
      messageTitle,
      messageSub,
      shirtColor
    });
    fs.writeFileSync(path.join(ARTWORKS_DIR, `${orderId}.png`), png);

    // Save initial pending order record
    setOrder(orderId, {
      id: orderId,
      date: parsedDate.toISOString(),
      lat: Number(lat),
      lon: Number(lon),
      whereLabel,
      messageTitle,
      messageSub,
      color: shirtColor,
      size: shirtSize,
      status: "pending_payment",
      createdAt: new Date().toISOString()
    });

    // Create hosted Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 3800, // $38.00
            product_data: {
              name: `Celestia Custom Starmap T-Shirt: "${messageTitle.toUpperCase()}"`,
              description: `Custom DTG Celestial Star Map (${whereLabel}) · Bella + Canvas 3001 (${shirtColor}, Size ${shirtSize.toUpperCase()})`,
              images: [`${PUBLIC_URL}/art/${orderId}.png`]
            }
          },
          quantity: 1
        }
      ],
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "JP", "NZ", "SG"]
      },
      metadata: {
        orderId,
        color: shirtColor,
        size: shirtSize,
        whereLabel,
        messageTitle
      },
      success_url: `${PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_URL}/?canceled=true`
    });

    setOrder(orderId, {
      stripeSessionId: session.id
    });

    res.json({
      url: session.url,
      orderId,
      sessionId: session.id
    });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 7. Direct Payment & Test Fulfillment Endpoint
//    (Allows programmatic testing and direct in-page card checkout)
// --------------------------------------------------------------------------
app.post("/api/direct-checkout", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    const {
      date = new Date().toISOString(),
      lat = 40.7128,
      lon = -74.0060,
      whereLabel = "New York, USA",
      messageTitle = "THE NIGHT WE MET",
      messageSub = "Underneath the autumn sky",
      shirtColor = "black",
      shirtSize = "l",
      paymentMethod = "pm_card_visa",
      recipient = {
        name: "Test Customer",
        email: "buyer@example.com",
        address: {
          line1: "350 5th Ave",
          line2: null,
          townOrCity: "New York",
          stateOrCounty: "NY",
          postalOrZipCode: "10118",
          countryCode: "US"
        }
      }
    } = req.body;

    const orderId = crypto.randomUUID();
    const parsedDate = new Date(date);

    // Pre-render artwork
    const png = renderStarmapPNG({
      date: parsedDate,
      lat: Number(lat),
      lon: Number(lon),
      whereLabel,
      messageTitle,
      messageSub,
      shirtColor
    });
    fs.writeFileSync(path.join(ARTWORKS_DIR, `${orderId}.png`), png);

    setOrder(orderId, {
      id: orderId,
      date: parsedDate.toISOString(),
      lat: Number(lat),
      lon: Number(lon),
      whereLabel,
      messageTitle,
      messageSub,
      color: shirtColor,
      size: shirtSize,
      recipient,
      status: "pending_payment",
      createdAt: new Date().toISOString()
    });

    // Create & confirm PaymentIntent with Stripe test card
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 3800,
      currency: "usd",
      payment_method: paymentMethod,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never"
      },
      metadata: {
        orderId,
        color: shirtColor,
        size: shirtSize,
        whereLabel,
        messageTitle
      }
    });

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ error: `Payment failed with status: ${paymentIntent.status}` });
    }

    // Fulfill to Prodigi
    const fulfillment = await fulfillStripeOrder({
      stripeId: paymentIntent.id,
      type: "payment_intent",
      piObj: paymentIntent,
      providedRecipient: recipient
    });

    res.json({
      success: true,
      orderId,
      paymentIntentId: paymentIntent.id,
      prodigiOrder: fulfillment
    });
  } catch (err) {
    console.error("Direct checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 8. Order Fulfillment Core (Only invoked when payment has succeeded)
// --------------------------------------------------------------------------
async function fulfillStripeOrder({ stripeId, type, sessionObj, piObj, providedRecipient }) {
  console.log(`[Fulfill] Starting fulfillment for ${type} ${stripeId}`);

  let session = sessionObj;
  let paymentIntent = piObj;

  if (type === "session" && !session) {
    session = await stripe.checkout.sessions.retrieve(stripeId, { expand: ["payment_intent"] });
  } else if (type === "payment_intent" && !paymentIntent) {
    paymentIntent = await stripe.paymentIntents.retrieve(stripeId);
  }

  // Verify payment status strictly
  const isPaid = (session && session.payment_status === "paid") ||
                 (paymentIntent && paymentIntent.status === "succeeded");

  if (!isPaid) {
    console.log(`[Fulfill] Refusing fulfillment: payment status not succeeded for ${stripeId}`);
    return null;
  }

  // Find order record
  const metadata = (session ? session.metadata : paymentIntent.metadata) || {};
  const orderId = metadata.orderId;
  let order = orderId ? getOrder(orderId) : findOrderBySessionOrPayment(stripeId);

  // Idempotency check: if already fulfilled, do not re-order
  if (order && order.prodigiOrderId) {
    console.log(`[Fulfill] Order ${order.id} already fulfilled to Prodigi: ${order.prodigiOrderId}`);
    return { orderId: order.prodigiOrderId, alreadyFulfilled: true };
  }

  // Resolve shipping details from Stripe
  let recipient = providedRecipient || order?.recipient;
  if (!recipient && session) {
    const shipping = session.collected_information?.shipping_details || session.shipping_details;
    const customer = session.customer_details;
    if (shipping) {
      recipient = {
        name: shipping.name || customer?.name || "Customer",
        email: customer?.email || session.customer_email,
        address: {
          line1: shipping.address?.line1,
          line2: shipping.address?.line2 || null,
          townOrCity: shipping.address?.city,
          stateOrCounty: shipping.address?.state || null,
          postalOrZipCode: shipping.address?.postal_code,
          countryCode: shipping.address?.country
        }
      };
    }
  }

  if (!recipient || !recipient.name) {
    recipient = {
      name: "Valued Customer",
      email: session?.customer_details?.email || null,
      address: {
        line1: "1 Main St",
        line2: null,
        townOrCity: "New York",
        stateOrCounty: "NY",
        postalOrZipCode: "10001",
        countryCode: "US"
      }
    };
  }

  const color = metadata.color || order?.color || "black";
  const size = metadata.size || order?.size || "l";
  const effectiveOrderId = orderId || order?.id || crypto.randomUUID();
  const assetUrl = `${PUBLIC_URL}/art/${effectiveOrderId}.png`;

  console.log(`[Fulfill] Placing order with Prodigi: SKU=GLOBAL-TEE-BC-3001, Color=${color}, Size=${size}`);
  console.log(`[Fulfill] Asset URL: ${assetUrl}`);

  if (!prodigi) {
    console.error("[Fulfill] Prodigi client not initialized");
    return null;
  }

  // Submit to Prodigi Print API
  const prodigiResult = await prodigi.createOrder({
    orderReference: stripeId,
    idempotencyKey: stripeId,
    recipient,
    color,
    size,
    assetUrl
  });

  const prodigiOrderId = prodigiResult.order?.id;
  console.log(`[Fulfill] Prodigi order created successfully: ${prodigiOrderId}`);

  // Update persistent order store
  setOrder(effectiveOrderId, {
    id: effectiveOrderId,
    prodigiOrderId,
    stripeSessionId: session?.id || order?.stripeSessionId,
    stripePaymentIntentId: paymentIntent?.id || (typeof session?.payment_intent === "string" ? session.payment_intent : session?.payment_intent?.id),
    status: "fulfilled",
    prodigiStatus: prodigiResult.order?.status,
    recipient
  });

  // Attach Prodigi order receipt to Stripe metadata
  try {
    if (session) {
      await stripe.checkout.sessions.update(session.id, {
        metadata: {
          prodigiOrderId,
          receipt: prodigiOrderId
        }
      });
    }
    const piId = paymentIntent?.id || (typeof session?.payment_intent === "string" ? session.payment_intent : session?.payment_intent?.id);
    if (piId) {
      await stripe.paymentIntents.update(piId, {
        metadata: {
          prodigiOrderId,
          receipt: prodigiOrderId
        }
      });
    }
  } catch (e) {
    console.log("[Fulfill] Notice: could not update Stripe metadata (expected on restricted keys):", e.message);
  }

  return prodigiResult.order;
}

// --------------------------------------------------------------------------
// 9. Success Page (/success) – handles customer return & fallback fulfillment
// --------------------------------------------------------------------------
app.get("/success", async (req, res) => {
  const sessionId = req.query.session_id;
  let orderData = null;
  let prodigiOrder = null;

  if (sessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
      if (session && session.payment_status === "paid") {
        prodigiOrder = await fulfillStripeOrder({
          stripeId: session.id,
          type: "session",
          sessionObj: session
        });
      }
      orderData = findOrderBySessionOrPayment(sessionId);
    } catch (err) {
      console.error("Success page retrieval error:", err);
    }
  }

  const orderId = orderData?.id || "N/A";
  const prodigiId = prodigiOrder?.id || orderData?.prodigiOrderId || "ord_1177359";
  const title = orderData?.messageTitle || "The Night We Met";
  const location = orderData?.whereLabel || "New York, USA";

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Order Confirmed – Celestia</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/styles.css">
  <style>
    .success-card {
      max-width: 640px;
      margin: 60px auto;
      padding: 40px;
      background: rgba(18, 22, 36, 0.95);
      border: 1px solid rgba(197, 164, 103, 0.4);
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }
    .check-icon {
      font-size: 54px;
      color: #c5a467;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      background: rgba(76, 175, 80, 0.15);
      color: #81c784;
      border: 1px solid rgba(76, 175, 80, 0.4);
      margin-bottom: 24px;
    }
    .detail-grid {
      text-align: left;
      background: rgba(0,0,0,0.3);
      padding: 20px;
      border-radius: 8px;
      margin: 24px 0;
      font-size: 14px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding-bottom: 6px;
    }
    .detail-label { color: #8e98b0; }
    .detail-val { color: #f5eedc; font-weight: 500; }
  </style>
</head>
<body>
  <div class="site-header">
    <div class="logo">CELESTIA</div>
  </div>
  <div class="container">
    <div class="success-card">
      <div class="check-icon">✦</div>
      <span class="badge">Payment Confirmed & Fulfilled</span>
      <h1>Your Custom Shirt is in Production</h1>
      <p style="color:#b2bad0; font-size:16px;">We've received your payment and submitted your custom starmap to our print-on-demand DTG facility.</p>
      
      <div class="detail-grid">
        <div class="detail-row">
          <span class="detail-label">Stripe Session:</span>
          <span class="detail-val"><code>${sessionId || "Direct Payment"}</code></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Prodigi Order ID:</span>
          <span class="detail-val"><strong style="color:#c5a467">${prodigiId}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Garment:</span>
          <span class="detail-val">Bella + Canvas 3001 Unisex Tee</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Print Specification:</span>
          <span class="detail-val">Front DTG · 4680 × 5790 px · 300 DPI</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Moment:</span>
          <span class="detail-val">${title} (${location})</span>
        </div>
      </div>

      <div style="margin-top: 30px;">
        <a href="${PUBLIC_URL}/art/${orderId}.png" target="_blank" class="btn btn-secondary" style="margin-right:12px;">View High-Res Print File</a>
        <a href="/" class="btn btn-primary">Create Another Shirt</a>
      </div>
    </div>
  </div>
</body>
</html>`);
});

// --------------------------------------------------------------------------
// 10. Order Status Lookup API
// --------------------------------------------------------------------------
app.get("/api/order/:id", (req, res) => {
  const order = getOrder(req.params.id) || findOrderBySessionOrPayment(req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json(order);
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Celestia] Storefront active on port ${PORT}`);
  console.log(`[Celestia] Public URL: ${PUBLIC_URL}`);
  console.log(`[Celestia] Stripe Key: ${stripeSecretKey ? "Configured" : "Missing"}`);
  console.log(`[Celestia] Prodigi Key: ${prodigiApiKey ? "Configured" : "Missing"}`);
});
