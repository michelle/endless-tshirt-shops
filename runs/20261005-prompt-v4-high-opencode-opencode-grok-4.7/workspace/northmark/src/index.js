import express from "express";
import { fileURLToPath } from "node:url";
import { COLORS, SIZES, COUNTRIES, US_STATES, SHIPPING_METHOD, sizeById } from "./catalog.js";
import { validateDesign, validateShipping } from "./validate.js";
import { quoteOrder } from "./prodigi.js";
import { renderPng } from "./render.js";
import { PRINT_W } from "./design.js";
import { createCheckout, fulfill, orderStatus, stripeClient } from "./orders.js";
import { specFromMetadata } from "./validate.js";

const app = express();
app.use(express.static(fileURLToPath(new URL("../public/", import.meta.url))));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, studio: "northmark" });
});

app.get("/api/catalog", (_req, res) => {
  res.json({ colors: COLORS, sizes: SIZES, countries: COUNTRIES, states: US_STATES, currency: "usd" });
});

app.get("/api/geocode", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 80);
    if (q.length < 2) return res.json({ results: [] });
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", q);
    url.searchParams.set("count", "6");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const response = await fetch(url);
    if (!response.ok) {
      const err = new Error("City search is unavailable right now.");
      err.status = 502;
      throw err;
    }
    const data = await response.json();
    const results = (data.results || []).map((place) => ({
      name: place.name,
      admin: place.admin1 || "",
      country: place.country || "",
      countryCode: place.country_code || "",
      lat: place.latitude,
      lon: place.longitude,
      timezone: place.timezone,
    }));
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

app.post("/api/preview", express.json({ limit: "40kb" }), (req, res, next) => {
  try {
    const spec = validateDesign(req.body || {});
    const width = Math.min(PRINT_W, Math.max(480, Number(req.body.width) || 900));
    const png = renderPng(spec, width);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(png);
  } catch (error) {
    next(error);
  }
});

app.post("/api/quote", express.json({ limit: "20kb" }), async (req, res, next) => {
  try {
    const design = validateDesign(req.body || {});
    const country = String(req.body.country || "").toUpperCase();
    if (!COUNTRIES.some(([code]) => code === country)) {
      const err = new Error("Choose a country we ship to.");
      err.status = 400;
      throw err;
    }
    const quote = await quoteOrder({
      country,
      size: design.size,
      color: design.color,
      copies: design.copies,
      method: SHIPPING_METHOD,
    });
    const size = sizeById(design.size);
    const shirtCents = size.price * design.copies;
    const shippingCents = quote.shipping.cents;
    res.json({
      shirtCents,
      shippingCents,
      totalCents: shirtCents + shippingCents,
      currency: "usd",
      method: quote.method,
      wholesaleNote: null,
      issues: quote.issues,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/checkout", express.json({ limit: "40kb" }), async (req, res, next) => {
  try {
    const design = validateDesign(req.body || {});
    const shipping = validateShipping(req.body || {});
    const quote = await quoteOrder({
      country: shipping.country,
      size: design.size,
      color: design.color,
      copies: design.copies,
      method: SHIPPING_METHOD,
    });
    if (!quote.shipping.cents && quote.shipping.cents !== 0) {
      const err = new Error("Shipping could not be priced.");
      err.status = 400;
      throw err;
    }
    const origin = originOf(req);
    const session = await createCheckout({
      spec: {
        ...design,
        ...shipping,
        method: quote.method || SHIPPING_METHOD,
        shippingCents: quote.shipping.cents,
      },
      origin,
    });
    res.json(session);
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders/:id/fulfill", async (req, res, next) => {
  try {
    const summary = await fulfill(req.params.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders/:id", async (req, res, next) => {
  try {
    const summary = await orderStatus(req.params.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

app.get("/art/:id.png", async (req, res, next) => {
  try {
    const id = req.params.id;
    const session = await stripeClient().checkout.sessions.retrieve(id);
    if (session.payment_status !== "paid") {
      res.status(403).type("text/plain").send("Artwork is released after payment.");
      return;
    }
    const spec = specFromMetadata(session.metadata || {});
    const png = renderPng(spec, PRINT_W);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(png);
  } catch (error) {
    next(error);
  }
});

app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const event = parseEvent(req.body);
    if (event?.type === "checkout.session.completed" || event?.type === "checkout.session.async_payment_succeeded") {
      const id = event.data?.object?.id;
      if (id) await fulfill(id);
    }
    res.json({ received: true });
  } catch (error) {
    console.error("webhook", error);
    res.status(200).json({ received: true, ignored: true });
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || error.statusCode || 500;
  const message = status >= 500 && !error.detail ? "The studio hit a snag. Please try again." : error.message;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: message || "Request failed.",
    detail: error.detail?.issues || error.detail?.error || undefined,
  });
});

function originOf(req) {
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return `${proto}://${host}`;
}

function parseEvent(body) {
  if (!body) return null;
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString("utf8"));
  if (typeof body === "string") return JSON.parse(body);
  if (typeof body === "object") return body;
  return null;
}

export default app;

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Northmark listening on ${port}`);
  });
}
