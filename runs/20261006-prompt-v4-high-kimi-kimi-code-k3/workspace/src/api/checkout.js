const env = require("../../lib/env");
const config = require("../../lib/config");
const { stripeApi } = require("../../lib/stripe");
const { sign } = require("../../lib/sign");
const { publicUrl } = require("../../lib/fulfill");
const { readJsonBody, sendJson } = require("../../lib/http");

function bad(res, msg) {
  return sendJson(res, 400, { error: msg });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });

  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return bad(res, "invalid JSON");
  }

  const { title, subtitle, date, time, place, color, size } = body;
  const lat = Number(body.lat);
  const lon = Number(body.lon);

  if (!title || !String(title).trim()) return bad(res, "Names / title is required");
  if (String(title).length > 60) return bad(res, "Title too long (max 60 chars)");
  if (subtitle && String(subtitle).length > 80) return bad(res, "Dedication too long (max 80 chars)");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad(res, "Date required (YYYY-MM-DD)");
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return bad(res, "Time required (HH:MM)");
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) return bad(res, "Pick a place so we know the latitude");
  if (!Number.isFinite(lon) || Math.abs(lon) > 180) return bad(res, "Pick a place so we know the longitude");
  if (!config.COLORS[color]) return bad(res, "Unknown shirt color");
  if (!config.SIZES.includes(size)) return bad(res, "Unknown shirt size");

  // Interpret the entered clock time as local (solar) time at the chosen place:
  // offset from UTC approximated from longitude (15° per hour).
  const offsetHours = Math.max(-12, Math.min(14, Math.round(lon / 15)));
  const naiveUtc = Date.parse(date + "T" + time + ":00Z");
  if (Number.isNaN(naiveUtc)) return bad(res, "Invalid date/time");
  const instant = new Date(naiveUtc - offsetHours * 3600e3);
  const year = instant.getUTCFullYear();
  if (year < 1900 || year > 2100) return bad(res, "Date must be between 1900 and 2100");

  const design = {
    title: String(title).trim(),
    subtitle: String(subtitle || "").trim(),
    iso: instant.toISOString(),
    lat,
    lon,
    place: String(place || "").trim().slice(0, 60),
    ink: config.COLORS[color].ink,
  };
  const sig = sign(design, env.get("ART_SIGNING_SECRET"));
  const base = publicUrl();

  try {
    const session = await stripeApi("POST", "/v1/checkout/sessions", {
      mode: "payment",
      success_url: base + "/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: base + "/?canceled=1",
      "line_items[0][price_data][currency]": config.CURRENCY,
      "line_items[0][price_data][unit_amount]": config.PRICE_CENTS,
      "line_items[0][price_data][product_data][name]":
        config.PRODUCT_NAME + " — " + config.COLORS[color].label + ", size " + size.toUpperCase(),
      "line_items[0][price_data][product_data][description]":
        "Custom star map for " + design.place + " on " + date + " " + time,
      "line_items[0][quantity]": 1,
      shipping_address_collection: { allowed_countries: config.ALLOWED_SHIP_COUNTRIES },
      phone_number_collection: { enabled: true },
      metadata: {
        design: JSON.stringify(design),
        sig,
        sku: config.PRODUCT_SKU,
        size,
        color,
      },
    });
    return sendJson(res, 200, { url: session.url });
  } catch (e) {
    console.error("checkout failed:", e.message);
    return sendJson(res, 502, { error: "Could not create checkout session: " + e.message });
  }
};
