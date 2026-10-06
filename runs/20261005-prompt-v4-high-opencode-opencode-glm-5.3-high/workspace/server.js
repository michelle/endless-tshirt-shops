// Starloom — custom star-map t-shirts, printed on demand via Prodigi.
import express from "express";
import { readFileSync } from "node:fs";
import { mustLoadEnv, STORE, PORT, PAYMENT_DRIVER } from "./src/env.js";
import { quoteOrder, getProdigiOrder } from "./src/prodigi.js";
import { createOrder, getOrder, updateOrder } from "./src/orders.js";
import { fulfillOrder } from "./src/fulfillment.js";
import {
  driverInfo, mockPayUrl, chargeMock, createStripeCheckout,
  verifyStripeSession, verifyStripeSignature, settleAndFulfill,
} from "./src/payments.js";

mustLoadEnv();

const app = express();
app.set("trust proxy", true); // behind the Cloudflare tunnel

// Stripe webhook needs the RAW body for signature verification — register it
// before the global JSON parser consumes the stream.
app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json", limit: "512kb" }),
  async (req, res) => {
    if (PAYMENT_DRIVER !== "stripe") return res.status(404).end();
    const sig = req.headers["stripe-signature"];
    const verified = verifyStripeSignature(req.body.toString("utf8"), sig || "");
    if (!verified) return res.status(400).json({ error: "Bad signature" });
    const event = JSON.parse(req.body.toString("utf8"));
    if (event.type === "checkout.session.completed") {
      const orderId = event.data?.object?.metadata?.orderId;
      const order = orderId ? getOrder(orderId) : null;
      if (order && order.status === "pending_payment" && order.payment?.driver === "stripe") {
        try {
          const paid = updateOrder(
            order.id,
            {
              status: "paid",
              payment: {
                ...order.payment,
                ref: event.data.object.payment_intent,
                paidAt: new Date().toISOString(),
              },
            },
            { type: "payment_succeeded", driver: "stripe", via: "webhook" }
          );
          await fulfillOrder(paid, req);
        } catch (err) {
          console.error("[webhook] fulfill failed:", err);
        }
      }
    }
    res.json({ received: true });
  }
);

app.use(express.json({ limit: "64kb" }));

const COUNTRIES = JSON.parse(readFileSync("data/countries.json", "utf8"));
const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

// ---------------------------------------------------------------- helpers --
class BadRequest extends Error {
  constructor(msg) {
    super(msg);
    this.status = 400;
  }
}
const str = (v, max, { min = 0 } = {}) => {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw new BadRequest("Invalid input.");
  v = v.trim();
  if (v.length < min || v.length > max) throw new BadRequest(`Must be ${min}-${max} characters.`);
  return v;
};
const num = (v, lo, hi) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < lo || n > hi) throw new BadRequest(`Must be between ${lo} and ${hi}.`);
  return n;
};

function validateDesign(d) {
  if (!d || typeof d !== "object") throw new BadRequest("Missing design.");
  const dateStr = str(d.dateStr, 10, { min: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(Date.parse(`${dateStr}T00:00Z`))) {
    throw new BadRequest("Invalid date.");
  }
  const year = Number(dateStr.slice(0, 4));
  if (year < 1900 || year > 2100) throw new BadRequest("Date must be between 1900 and 2100.");
  const timeStr = str(d.timeStr, 5, { min: 5 });
  if (!/^\d{2}:\d{2}$/.test(timeStr) || Number(timeStr.slice(0, 2)) > 23 || Number(timeStr.slice(3)) > 59) {
    throw new BadRequest("Invalid time.");
  }
  const tz = str(d.tz, 60, { min: 1 });
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new BadRequest("Unknown timezone.");
  }
  return {
    lat: num(d.lat, -90, 90),
    lon: num(d.lon, -180, 180),
    dateStr,
    timeStr,
    tz,
    place: str(d.place, 48, { min: 1 }).replace(/[·×]/g, ""),
    title: str(d.title, 30),
    message: str(d.message, 42),
    showLines: d.showLines !== false,
  };
}

function validateProduct(p) {
  const color = STORE.product.colors.find((c) => c.id === p?.color);
  if (!color) throw new BadRequest("Pick a shirt color.");
  const size = String(p?.size || "").toLowerCase();
  if (!STORE.product.sizes.includes(size)) throw new BadRequest("Pick a shirt size.");
  return { color: color.id, size };
}

function validateRecipient(r) {
  if (!r || typeof r !== "object") throw new BadRequest("Missing shipping details.");
  const out = {
    name: str(r.name, 100, { min: 2 }),
    line1: str(r.line1, 100, { min: 4 }),
    line2: str(r.line2, 100),
    city: str(r.city, 60, { min: 2 }),
    state: str(r.state, 60),
    zip: str(r.zip, 20, { min: 3 }),
    country: str(r.country, 2, { min: 2 }).toUpperCase(),
    email: str(r.email, 120).toLowerCase(),
    phone: str(r.phone, 30),
  };
  if (!COUNTRY_CODES.has(out.country)) throw new BadRequest("Unsupported destination country.");
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) {
    throw new BadRequest("That email address doesn't look right.");
  }
  return out;
}

function publicOrderView(order) {
  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    design: order.design,
    product: order.product,
    amounts: order.amounts,
    recipient: { name: order.recipient.name, city: order.recipient.city, country: order.recipient.country },
    payment: order.payment
      ? {
          driver: order.payment.driver,
          last4: order.payment.last4,
          ref: order.payment.ref,
          paidAt: order.payment.paidAt,
        }
      : null,
    prodigi: order.prodigi
      ? {
          orderId: order.prodigi.orderId,
          outcome: order.prodigi.outcome,
          stage: order.prodigi.stage,
          details: order.prodigi.details,
          issues: order.prodigi.issues,
          shipments: order.prodigi.shipments,
        }
      : null,
    previewUrl: order.printFile ? `/print-files/${order.printFile.uuid}-preview.png` : null,
    printFileUrl: order.printFile ? order.printFile.url : null,
    fulfillmentError: order.fulfillmentError || null,
    events: order.events,
  };
}

// ---------------------------------------------------------------- routes ----
app.get("/healthz", (_req, res) => res.json({ ok: true, driver: PAYMENT_DRIVER }));

app.get("/api/config", (_req, res) => {
  res.json({
    store: { name: STORE.name, tagline: STORE.tagline },
    product: STORE.product,
    retail: STORE.retail,
    payment: driverInfo(),
  });
});

app.get("/api/countries", (_req, res) => res.json(COUNTRIES));

// Wholesale quote from Prodigi (merchant-side only; never sent to the browser).
app.post("/api/quote", (req, res) => {
  try {
    const product = validateProduct(req.body || {});
    const country = str(req.body?.country, 2, { min: 2 }).toUpperCase();
    if (!COUNTRY_CODES.has(country)) throw new BadRequest("Unsupported destination country.");
    quoteOrder({ attributes: { color: product.color, size: product.size }, destinationCountryCode: country })
      .then((q) => {
        const quote = q.quotes?.[0];
        res.json({
          ok: true,
          currency: STORE.retail.currency,
          item: STORE.retail.item,
          shipping: STORE.retail.shipping,
          total: STORE.retail.item + STORE.retail.shipping,
          servable: true,
        });
        console.log(
          `[quote] ${product.color}/${product.size} -> ${country}: wholesale`,
          quote?.costSummary?.items?.amount, "+ shipping", quote?.costSummary?.shipping?.amount,
          quote?.costSummary?.totalCost?.amount, quote?.costSummary?.totalCost?.currency
        );
      })
      .catch((err) => {
        console.error("[quote] failed:", err.message);
        if (err.status && err.status >= 400 && err.status < 500) {
          res.status(400).json({ ok: false, error: "We can't ship to that destination yet." });
        } else {
          res.json({
            ok: true, currency: STORE.retail.currency, item: STORE.retail.item,
            shipping: STORE.retail.shipping, total: STORE.retail.item + STORE.retail.shipping,
            servable: true,
          });
        }
      });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Create a pending order + a payment session.
app.post("/api/checkout", async (req, res) => {
  let design, product, recipient;
  try {
    design = validateDesign(req.body?.design);
    product = validateProduct(req.body?.product);
    recipient = validateRecipient(req.body?.recipient);
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }

  // Confirm Prodigi can fulfil this variant to this destination before payment.
  let wholesale = null;
  try {
    const q = await quoteOrder({
      attributes: { color: product.color, size: product.size },
      destinationCountryCode: recipient.country,
    });
    const s = q.quotes?.[0]?.costSummary;
    if (s?.totalCost) wholesale = { items: s.items?.amount, shipping: s.shipping?.amount, total: s.totalCost?.amount, currency: s.totalCost?.currency };
  } catch (err) {
    if (err.status && err.status >= 400 && err.status < 500) {
      return res.status(400).json({ ok: false, error: "We can't ship this shirt to that country yet." });
    }
    console.warn("[checkout] quote unavailable, continuing:", err.message);
  }

  const order = createOrder({
    design,
    product,
    recipient,
    amounts: {
      currency: STORE.retail.currency,
      item: STORE.retail.item,
      shipping: STORE.retail.shipping,
      total: STORE.retail.item + STORE.retail.shipping,
    },
    wholesale,
  });

  try {
    if (PAYMENT_DRIVER === "stripe") {
      const url = await createStripeCheckout(order, req);
      return res.json({ ok: true, orderId: order.id, payment: { type: "redirect", url } });
    }
    return res.json({
      ok: true,
      orderId: order.id,
      payment: { type: "hosted_form", url: mockPayUrl(order) },
    });
  } catch (err) {
    console.error("[checkout] payment init failed:", err);
    return res.status(502).json({ ok: false, error: "Could not start payment. Please try again." });
  }
});

// Sandbox test-checkout charge (mock driver only).
app.post("/api/pay/:id", async (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ ok: false, error: "Order not found." });
  try {
    const paid = await chargeMock(order, req.body?.card || {});
    const fulfilled = await settleAndFulfill(paid, req);
    return res.json({ ok: true, url: `/order/${fulfilled.id}` });
  } catch (err) {
    if (err.code) {
      updateOrder(order.id, {}, { type: "payment_attempt_failed", error: err.code });
      return res.status(err.status || 402).json({ ok: false, error: { code: err.code, message: err.message } });
    }
    console.error("[pay] error:", err);
    return res.status(500).json({ ok: false, error: { code: "internal", message: "Something went wrong." } });
  }
});

// Stripe checkout return: verify + fulfil before rendering the order page.
app.get("/order/:id", async (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).sendFile("404.html", { root: "public" });
  if (PAYMENT_DRIVER === "stripe" && req.query.session_id && order.payment?.sessionId === req.query.session_id && !["paid", "fulfilling", "complete"].includes(order.status)) {
    try {
      const verified = await verifyStripeSession(order, req.query.session_id);
      await settleAndFulfill(verified, req);
    } catch (err) {
      console.error("[stripe verify] failed:", err);
    }
    return res.redirect(`/order/${order.id}`);
  }
  res.sendFile("order.html", { root: "public" });
});

app.get("/pay/:id", (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).sendFile("404.html", { root: "public" });
  if (PAYMENT_DRIVER !== "mock") return res.redirect(`/order/${order.id}`);
  res.sendFile("pay.html", { root: "public" });
});

// Public order status (used by the order page for live updates).
app.get("/api/order/:id", async (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ ok: false, error: "Order not found." });

  // Refresh from Prodigi if we haven't checked recently.
  if (order.prodigi?.orderId && order.status === "fulfilling") {
    const age = Date.now() - new Date(order.prodigi.lastChecked || 0).getTime();
    if (age > 20000) {
      try {
        const p = await getProdigiOrder(order.prodigi.orderId);
        const st = p?.order?.status;
        const stage = st?.stage ?? order.prodigi.stage;
        const done = stage === "Complete" || stage === "Cancelled";
        updateOrder(
          order.id,
          {
            status: done ? (stage === "Complete" ? "complete" : order.status) : order.status,
            prodigi: {
              ...order.prodigi,
              stage,
              details: st?.details,
              issues: st?.issues || [],
              shipments: p?.order?.shipments?.map((s) => ({
                status: s.status, carrier: s.carrier,
                tracking: s.tracking, dispatchDate: s.dispatchDate,
                fulfillmentLocation: s.fulfillmentLocation,
              })),
              lastChecked: new Date().toISOString(),
            },
          },
          { type: "prodigi_status_refresh", stage }
        );
      } catch (err) {
        console.warn("[order status] refresh failed:", err.message);
      }
    }
  }
  const fresh = getOrder(req.params.id);
  res.json({ ok: true, order: publicOrderView(fresh) });
});

// Retry a failed fulfilment (e.g. Prodigi was temporarily down).
app.post("/api/order/:id/retry", async (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ ok: false, error: "Order not found." });
  if (order.status !== "paid_fulfillment_failed") {
    return res.status(409).json({ ok: false, error: "Nothing to retry." });
  }
  const updated = updateOrder(order.id, { status: "paid", fulfillmentError: null }, { type: "fulfillment_retry" });
  const fulfilled = await fulfillOrder(updated, req);
  res.json({ ok: true, order: publicOrderView(fulfilled) });
});

// ---------------------------------------------------------------- static ---
app.get("/src/astro.js", (_req, res) => res.type("application/javascript").sendFile("src/astro.js", { root: "." }));
app.get("/src/render.js", (_req, res) => res.type("application/javascript").sendFile("src/render.js", { root: "." }));
app.use("/print-files", express.static("data/print-files", { maxAge: "1d" }));
app.use("/fonts", express.static("fonts", { maxAge: "30d" }));
app.use("/data", express.static("data", { maxAge: "30d" }));
app.use(express.static("public", { maxAge: "5m" }));

app.use((req, res) => res.status(404).sendFile("404.html", { root: "public" }));

app.listen(PORT, () => {
  console.log(`Starloom store listening on :${PORT} (payment driver: ${PAYMENT_DRIVER})`);
});
