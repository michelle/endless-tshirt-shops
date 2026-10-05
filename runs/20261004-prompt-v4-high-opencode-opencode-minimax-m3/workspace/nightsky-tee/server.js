// NightSky Tee – server.
//
// Routes:
//   GET  /                              => marketing page (index.html)
//   GET  /api/cities                    => list of cities for autocomplete
//   POST /api/preview                   => returns rendered PNG preview
//   POST /api/quote                     => pricing estimate
//   POST /api/checkout                  => creates Stripe Checkout session
//   GET  /success?session_id=…          => order success page
//   GET  /cancel                        => order-cancelled page
//   POST /webhook/stripe                => Stripe webhook listener
//   GET  /api/order/:id                 => look up an order (used by success page)
//   GET  /preview/:orderId.png          => preview PNG for an order
//
// Environment variables:
//   STRIPE_SECRET_KEY       rk*_test_…  (required in production)
//   STRIPE_WEBHOOK_SECRET   whsec_…    (required in production)
//   PRODIGI_API_KEY         test_…     (required)
//   PUBLIC_URL              https://…   (for Stripe redirects + asset URLs)
//   PORT                    default 8787

import "./lib/dotenv.js";
import express      from "express";
import crypto       from "node:crypto";
import { writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path         from "node:path";
import { fileURLToPath } from "node:url";

import Stripe       from "stripe";
import { Resvg }    from "@resvg/resvg-js";

import { renderStarmapSVG } from "./lib/starmap.js";
import { CITIES }            from "./lib/astro.js";
import { ProdigiClient, TEE_SKU } from "./lib/prodigi.js";
import { orders }            from "./lib/storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Misc dirs
const PREVIEWS_DIR = path.join(__dirname, "data", "previews");
await mkdir(PREVIEWS_DIR, { recursive: true });

// ----- env -----------------------------------------------------------------

const PORT = parseInt(process.env.PORT || "8787", 10);
const STRIPE_SECRET     = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK    = process.env.STRIPE_WEBHOOK_SECRET;
const PRODIGI_API_KEY   = process.env.PRODIGI_API_KEY;
const PUBLIC_URL        = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const NODE_ENV          = process.env.NODE_ENV || "development";

// ----- server hardening ----------------------------------------------------

const app = express();
// Stripe needs the raw body to verify webhooks, so we mount that route *before* json parser.
app.use("/webhook/stripe", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public"), {
  extensions: ["html"]
}));

// ----- clients -------------------------------------------------------------

const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2025-09-30.clover" }) : null;
const prodigi = PRODIGI_API_KEY ? new ProdigiClient({ apiKey: PRODIGI_API_KEY }) : null;

// ----- config ---------------------------------------------------------------

const PRODUCT = {
  name: "NightSky Tee — personalized star map t-shirt",
  // Display currency for the storefront. Stripe will charge in USD.
  currency: "usd",
  priceCents: 4499,            // $44.99
  shirtColorsAvailable: ["black", "navy", "charcoal"],
  shirtSizesAvailable:  ["xs", "s", "m", "l", "xl", "2xl", "3xl"]
};

// ----- helpers --------------------------------------------------------------

function bad(res, msg, status = 400) {
  return res.status(status).json({ error: msg });
}

// Ensure the preview image exists; create it if not.
async function getOrMakePreviewPng(orderId, opts) {
  const file = path.join(PREVIEWS_DIR, `${orderId}.png`);
  if (existsSync(file)) return file;
  const svg = renderStarmapSVG({
    date:        opts.date,
    lat:         parseFloat(opts.lat),
    lon:         parseFloat(opts.lon),
    whereLabel:  opts.whereLabel,
    messageTitle: opts.messageTitle || "",
    messageSub:  opts.messageSub || "",
    shirtColor:  opts.shirtColor || "black",
    layout:      "portrait"
  });
  const r = new Resvg(svg, { fitTo: { mode: "width", value: 4680 } });
  const png = r.render().asPng();
  await writeFile(file, png);
  return file;
}

// ----- routes ---------------------------------------------------------------

app.get("/api/health", (_req, res) => res.json({
  ok: true,
  env: NODE_ENV,
  stripe: !!stripe,
  prodigi: !!prodigi,
  product: PRODUCT
}));

app.get("/api/cities", (req, res) => {
  const q = (req.query.q || "").toString().trim().toLowerCase();
  if (!q) return res.json(CITIES.slice(0, 15));
  const out = CITIES
    .filter(c => c.name.toLowerCase().includes(q))
    .slice(0, 15);
  res.json(out);
});

app.get("/api/product", (_req, res) => res.json(PRODUCT));

// Server-side preview generation. We store it to disk and return
// `data/previews/<id>.png` so the same URL works for the Stripe success page
// and for Prodigi (assetUrl must be HTTPS public).
app.post("/api/preview", async (req, res) => {
  try {
    const {
      date, lat, lon, whereLabel, messageTitle, messageSub, shirtColor
    } = req.body || {};
    if (!date || lat == null || lon == null) return bad(res, "date, lat and lon required");
    const id = req.body.orderId || crypto.randomUUID();
    await getOrMakePreviewPng(id, {
      date: new Date(date), lat, lon,
      whereLabel, messageTitle, messageSub, shirtColor
    });
    const url = `${PUBLIC_URL}/preview/${id}.png`;
    res.json({ id, url });
  } catch (e) {
    console.error(e);
    bad(res, e.message || "render failed");
  }
});

app.get("/preview/:file", async (req, res) => {
  // Filename is "<orderId>.png"
  const safe = req.params.file.replace(/[^a-zA-Z0-9_.\-]/g, "");
  const file = path.join(PREVIEWS_DIR, safe);
  try {
    const st = await stat(file);
    if (!st.isFile()) return res.sendStatus(404);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(file);
  } catch {
    res.sendStatus(404);
  }
});

// Pricing – compute a quick local estimate so the UI can show the price.
app.post("/api/quote", async (req, res) => {
  const { country = "US" } = req.body || {};
  const subtotal = PRODUCT.priceCents / 100;
  // naive shipping: $5.95 US, $9.95 everywhere else
  const shipping = country === "US" ? 5.95 : 9.95;
  res.json({
    subtotal, shippingCurrency: "USD",
    total: +(subtotal + shipping).toFixed(2),
    currency: "USD"
  });
});

// CHECKOUT – creates a Stripe Checkout Session and returns its `url`.
app.post("/api/checkout", async (req, res) => {
  if (!stripe) return bad(res, "Stripe not configured (missing STRIPE_SECRET_KEY)", 500);

  const {
    date, lat, lon, whereLabel,
    messageTitle, messageSub,
    shirtColor, shirtSize,
    shipping: shipTo
  } = req.body || {};
  if (!date || lat == null || lon == null) return bad(res, "date, lat and lon required");
  if (!PRODUCT.shirtColorsAvailable.includes(shirtColor)) return bad(res, "Invalid shirtColor");
  if (!PRODUCT.shirtSizesAvailable.includes(shirtSize))   return bad(res, "Invalid shirtSize");
  if (!shipTo?.line1 || !shipTo?.city || !shipTo?.zip || !shipTo?.country)
    return bad(res, "shipping address incomplete");

  try {
    // 1. Make the asset, render preview PNG, persist it.
    const orderId = crypto.randomUUID();
    const assetPath = await getOrMakePreviewPng(orderId, {
      date: new Date(date), lat, lon,
      whereLabel, messageTitle, messageSub, shirtColor
    });
    const assetUrl = `${PUBLIC_URL}/preview/${orderId}.png`;

    // 2. Stash the order in our in-memory store.
    orders.create({
      id: orderId,
      payload: {
        date: new Date(date).toISOString(),
        lat, lon,
        whereLabel: whereLabel || "",
        messageTitle: messageTitle || "",
        messageSub:  messageSub  || "",
        shirtColor,
        shirtSize,
        shipping: shipTo
      },
      stripeSessionId: null,
      assetUrl
    });

    // 3. Create Stripe checkout session.
    const lineItems = [{
      price_data: {
        currency: PRODUCT.currency,
        product_data: {
          name: PRODUCT.name,
          description: `Custom star map from ${whereLabel || "your moment"}, printed on a Bella+Canvas 3001 ${shirtColor} tee (size ${shirtSize}).`,
          images: [assetUrl]
        },
        unit_amount: PRODUCT.priceCents
      },
      quantity: 1
    }];
    if (shipTo.country !== "US") {
      lineItems.push({
        price_data: {
          currency: PRODUCT.currency,
          product_data: {
            name: "Worldwide shipping",
            description: `Shipping to ${shipTo.country}`
          },
          unit_amount: 995
        },
        quantity: 1
      });
    } else {
      lineItems.push({
        price_data: {
          currency: PRODUCT.currency,
          product_data: {
            name: "Standard shipping",
            description: "US shipping (3–5 business days)"
          },
          unit_amount: 595
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: shipTo.email || undefined,
      line_items: lineItems,
      metadata: {
        // crucial: link back to our order
        orderId,
        shirtColor,
        shirtSize
      },
      success_url: `${PUBLIC_URL}/success?order=${orderId}&session={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${PUBLIC_URL}/cancel?order=${orderId}`,
      shipping_address_collection: {
        // We collect shipping ourselves to put on Prodigi; but Stripe covers
        // billing address collection automatically.
        allowed_countries: [
          "US","GB","CA","AU","DE","FR","IT","ES","NL","BE","SE","NO",
          "DK","FI","JP","KR","SG","HK","TW","MX","BR","IE","PT","AT",
          "CH","PL","CZ","GR","NZ","IL","AE"
        ]
      }
    });

    orders.update(orderId, { stripeSessionId: session.id });

    res.json({
      orderId,
      sessionUrl: session.url,
      sessionId: session.id
    });
  } catch (e) {
    console.error("checkout error", e);
    bad(res, e.message || "checkout failed", 500);
  }
});

// SUCCESS – landing page after Stripe redirects back.
//
// Two things happen here:
//   1. Mark the order as paid (the success URL is only reached when
//      Stripe confirms the card payment succeeded for synchronous
//      payment methods).
//   2. If the order hasn't already been submitted to Prodigi, submit it.
//
// We also keep the Stripe-webhook pathway, which handles async methods
// (SEPA, ACH, etc.) where Stripe may confirm the payment later.
//
// `submitToProdigi()` is idempotent: only one request is made per orderId.
app.get("/success", async (req, res) => {
  const { order, session_id } = req.query;
  let o = order ? orders.get(String(order)) : null;

  if (o) {
    if (o.status === "awaiting_payment") {
      orders.update(o.id, {
        status: "paid",
        stripeSessionId: session_id ? String(session_id) : o.stripeSessionId
      });
    }
    if (o.status === "paid" || o.status === "submitted") {
      // Fire-and-forget; safe because submitToProdigi updates status
      // and is idempotent.
      submitToProdigi(o.id).catch(err => console.error("post-success submit", err));
    }
    // refresh for response rendering
    o = orders.get(o.id);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderSuccessPage(o));
});

app.get("/cancel", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderCancelPage());
});

app.get("/api/order/:id", (req, res) => {
  const o = orders.get(req.params.id);
  if (!o) return bad(res, "not found", 404);

  // Strip the asset URL in dev so we don't leak localhost over public APIs,
  // but only if our PUBLIC_URL isn't public.
  const isPublic = /^https/.test(PUBLIC_URL);
  res.json({
    id: o.id,
    status: o.status,
    createdAt: o.createdAt,
    shirtColor: o.payload?.shirtColor,
    shirtSize: o.payload?.shirtSize,
    whereLabel: o.payload?.whereLabel,
    messageTitle: o.payload?.messageTitle,
    date: o.payload?.date,
    prodigiOrderId: o.prodigiOrderId,
    prodigiOutcome: o.prodigiOutcome,
    error: o.error,
    assetUrl: isPublic ? o.assetUrl : null
  });
});

// WEBHOOK --------------------------------------------------------------
//
// Stripe does a one-shot POST here on `checkout.session.completed`.
//   - We verify the signature with STRIPE_WEBHOOK_SECRET
//   - Mark the order as paid
//   - Submit to Prodigi *only* after seeing a fully paid event
//
// We listen for both `checkout.session.completed` and the more general
// `checkout.session.async_payment_succeeded` because some payment methods
// (SEPA, ACH) authorize first and capture later.
app.post("/webhook/stripe", async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK) {
    console.warn("Webhook fired but Stripe not configured");
    return res.status(503).send("stripe not configured");
  }
  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK);
  } catch (e) {
    console.error("webhook signature failed", e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  try {
    if (event.type === "checkout.session.completed"
     || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const o = orderId ? orders.get(orderId) : null;
      if (!o) {
        console.warn("webhook for unknown order", orderId);
        return res.status(200).json({ received: true });
      }
      if (o.status === "submitted" || o.status === "paid") {
        return res.status(200).json({ received: true, alreadyHandled: true });
      }
      orders.update(o.id, { status: "paid", stripeSessionId: session.id });

      // Fire off to Prodigi.
      await submitToProdigi(o.id);
    } else {
      console.log("unhandled webhook event:", event.type);
    }
    res.json({ received: true });
  } catch (e) {
    console.error("webhook handler error", e);
    res.status(500).send("internal");
  }
});

async function submitToProdigi(orderId) {
  // Idempotency: if we already have a prodigiOrderId for this order, skip.
  // This matters because BOTH the Stripe webhook AND the success-page
  // fallback can trigger submission for synchronous card payments.
  console.log(`[prodigi] submitToProdigi called for ${orderId}`);
  const o = orders.get(orderId);
  if (!o) {
    console.log(`[prodigi] no order ${orderId}, ignored`);
    return;
  }
  if (o.status === "submitted" && o.prodigiOrderId) {
    console.log(`[prodigi] already submitted ${orderId} -> ${o.prodigiOrderId}`);
    return;
  }
  if (o.status === "failed") {
    console.log(`[prodigi] not retrying failed ${orderId}`);
    return;
  }
  if (!prodigi) {
    orders.update(orderId, { status: "failed", error: "Prodigi not configured (no PRODIGI_API_KEY)" });
    return;
  }
  try {
    orders.update(orderId, { status: "submitted" });
    const p = o.payload;
    const merchantReference = `NS-${orderId}`;
    const result = await prodigi.placeOrder({
      assetUrl: o.assetUrl,
      color: p.shirtColor,
      size: p.shirtSize,
      recipient: {
        name:        p.shipping.name,
        email:       p.shipping.email,
        phone:       p.shipping.phone,
        line1:       p.shipping.line1,
        line2:       p.shipping.line2,
        city:        p.shipping.city,
        state:       p.shipping.state,
        zip:         p.shipping.zip,
        country:     p.shipping.country
      },
      merchantReference,
      idempotencyKey: merchantReference,
      shippingMethod: p.shipping.country === "US" ? "Standard" : "StandardPlus",
      recipientCost: { amount: PRODUCT.priceCents.toFixed(2), currency: "USD" }
    });
    console.log(`[prodigi] placeOrder returned for ${orderId}: outcome=${result.outcome}, prodigiId=${result.order?.id}`);
    orders.update(orderId, {
      status: "submitted",
      prodigiOrderId: result.order?.id,
      prodigiOutcome: result.outcome
    });
  } catch (e) {
    console.error(`[prodigi] ERROR for ${orderId}:`, e.message, "\n  prodigiResp=", JSON.stringify(e.prodigiResp || {}).slice(0, 600));
    orders.update(orderId, {
      status: "failed",
      error: e.message?.slice(0, 200) || "prodigi failed"
    });
  }
}

// ----- HTML ---------------------------------------------------------------

function renderSuccessPage(o) {
  const orderId = o?.id || "";
  const status  = o?.status || "processing";
  const where   = o?.payload?.whereLabel || "your moment";
  const title   = o?.payload?.messageTitle || "Your NightSky Tee";
  const assetUrl = o?.assetUrl || null;
  const prodigiId = o?.prodigiOrderId || null;
  const prodigiOut = o?.prodigiOutcome || null;
  const errorText = o?.error || null;

  const detailLines = [];
  if (prodigiId) {
    detailLines.push(`<div class="kv"><span>Prodigi order</span><code>${escapeHtml(prodigiId)}</code></div>`);
    detailLines.push(`<div class="kv"><span>Status</span><strong>${escapeHtml(prodigiOut || "submitted")}</strong></div>`);
  } else if (errorText) {
    detailLines.push(`<div class="kv"><span>Print-lab error</span><strong>${escapeHtml(errorText)}</strong></div>`);
  }

  const previewImg = assetUrl
    ? `<img src="${escapeHtml(assetUrl)}" alt="Your design" style="width:100%;border-radius:8px;margin-bottom:1rem;display:block;">`
    : "";

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your NightSky Tee is on its way</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="page-narrow">
    <div class="hero-strip"></div>
    <h1>Thank you.</h1>
    <p class="lede">Your payment went through and we're forwarding your design to the printers. Production is usually 3&ndash;5 business days; ships from the nearest lab.</p>

    ${previewImg}

    <div class="card">
      <div class="kv"><span>Order</span><code>${escapeHtml(orderId)}</code></div>
      <div class="kv"><span>Title</span><strong>${escapeHtml(title)}</strong></div>
      <div class="kv"><span>Where</span><strong>${escapeHtml(where)}</strong></div>
      <div class="kv"><span>Status</span><strong id="status-cell">${prodigiId ? "Printing lab accepted" : "Submitting to print lab…"}</strong></div>
      ${detailLines.join("\n      ")}
    </div>

    <p class="muted">You'll get a tracking link by email as soon as the shirt ships. If anything looks wrong, reply to that email and we'll fix it.</p>

    <a class="btn" href="/">Make another</a>
  </main>
<script>
  // Poll until the Prodigi order is actually created (or 30 s elapses).
  (function poll() {
    const cell = document.getElementById("status-cell");
    if (!cell) return;
    fetch("/api/order/${encodeURIComponent(orderId)}", { cache: "no-store" })
      .then(r => r.json())
      .then(j => {
        if (j.prodigiOrderId) {
          cell.textContent = "Accepted by printing lab";
          // update the Status kv to be definitive; user doesn't need a reload
        } else if (j.error) {
          cell.textContent = "Print-lab error — we'll retry by email";
        } else if (Date.now() - start < 30000) {
          setTimeout(poll, 1500);
        }
      })
      .catch(() => { /* try again */ });
    var start = Date.now();
    setTimeout(poll, 800);
  })();
</script>
</body></html>`;
}

function renderCancelPage() {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cancelled</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="page-narrow">
    <h1>Cancelled.</h1>
    <p class="lede">No charge was made. Your design wasn't sent to the printers.</p>
    <a class="btn" href="/">Try again</a>
  </main>
</body></html>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"
  }[c]));
}

// ----- start ----------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`NightSky Tee listening on http://localhost:${PORT}`);
  console.log(`  PUBLIC_URL = ${PUBLIC_URL}`);
  console.log(`  Stripe    = ${stripe ? "configured" : "DISABLED"}`);
  console.log(`  Prodigi   = ${prodigi ? "configured" : "DISABLED"}`);
});
