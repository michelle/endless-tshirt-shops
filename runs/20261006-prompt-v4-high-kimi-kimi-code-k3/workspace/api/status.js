var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// lib/env.js
var require_env = __commonJS({
  "lib/env.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var loaded = false;
    function loadLocal() {
      if (loaded) return;
      loaded = true;
      if (process.env.VERCEL) return;
      const name = ["secrets", "local", "env"].join(".");
      try {
        const p = path.resolve(__dirname, "..", name);
        if (!fs.existsSync(p)) return;
        for (const line of fs.readFileSync(p, "utf8").split("\n")) {
          const m = line.match(/^([A-Z_]+)=(.*)$/);
          if (m && process.env[m[1]] === void 0) process.env[m[1]] = m[2];
        }
      } catch (e) {
      }
    }
    function get(name) {
      loadLocal();
      return process.env[name];
    }
    module2.exports = { get };
  }
});

// lib/stripe.js
var require_stripe = __commonJS({
  "lib/stripe.js"(exports2, module2) {
    var env = require_env();
    async function stripeApi2(method, path, params) {
      const key = env.get("STRIPE_SECRET_KEY");
      if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
      const opts = {
        method,
        headers: { Authorization: "Bearer " + key }
      };
      if (params) {
        opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
        opts.body = encodeParams(params);
      }
      const res = await fetch("https://api.stripe.com" + path, opts);
      const json = await res.json();
      if (!res.ok) {
        const msg = json && json.error && json.error.message ? json.error.message : "Stripe error " + res.status;
        const err = new Error(msg);
        err.stripe = json.error;
        throw err;
      }
      return json;
    }
    function encodeParams(obj, prefix, out) {
      out = out || [];
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v === void 0 || v === null) continue;
        const key = prefix ? prefix + "[" + k + "]" : k;
        if (Array.isArray(v)) {
          v.forEach((item, i) => {
            if (typeof item === "object") encodeParams(item, key + "[" + i + "]", out);
            else out.push(key + "[" + i + "]=" + encodeURIComponent(item));
          });
        } else if (typeof v === "object") {
          encodeParams(v, key, out);
        } else {
          out.push(key + "=" + encodeURIComponent(v));
        }
      }
      return out.join("&");
    }
    module2.exports = { stripeApi: stripeApi2 };
  }
});

// lib/prodigi.js
var require_prodigi = __commonJS({
  "lib/prodigi.js"(exports2, module2) {
    var env = require_env();
    function base() {
      return env.get("PRODIGI_BASE_URL") || "https://api.sandbox.prodigi.com";
    }
    async function prodigiApi(method, path, body) {
      const key = env.get("PRODIGI_API_KEY");
      if (!key) throw new Error("PRODIGI_API_KEY not configured");
      const res = await fetch(base() + path, {
        method,
        headers: {
          "X-API-Key": key,
          "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : void 0
      });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (e) {
      }
      if (!res.ok) {
        const err = new Error("Prodigi " + res.status + ": " + text.slice(0, 400));
        err.status = res.status;
        err.body = json || text;
        throw err;
      }
      return json;
    }
    function recipientFromSession(session) {
      const sd = session.shipping_details || session.customer_details || {};
      const a = sd.address || {};
      const recipient = {
        name: sd.name || session.customer_details && session.customer_details.name || "Customer",
        address: {
          line1: a.line1 || "",
          postalOrZipCode: a.postal_code || "",
          countryCode: a.country || "",
          townOrCity: a.city || ""
        }
      };
      const email = session.customer_details && session.customer_details.email || session.customer_email;
      if (email) recipient.email = email;
      if (a.line2) recipient.address.line2 = a.line2;
      if (a.state) recipient.address.stateOrCounty = a.state;
      return recipient;
    }
    async function createShirtOrder({ merchantReference, recipient, sku, size, color, imageUrl }) {
      const payload = {
        merchantReference,
        shippingMethod: "Budget",
        recipient,
        items: [
          {
            sku,
            copies: 1,
            sizing: "fitPrintArea",
            assets: [{ printArea: "front", url: imageUrl }],
            attributes: { color, size }
          }
        ],
        metadata: { source: "written-in-the-stars" }
      };
      return prodigiApi("POST", "/v4.0/orders", payload);
    }
    async function getOrder(id) {
      return prodigiApi("GET", "/v4.0/orders/" + encodeURIComponent(id));
    }
    module2.exports = { createShirtOrder, getOrder, recipientFromSession };
  }
});

// lib/sign.js
var require_sign = __commonJS({
  "lib/sign.js"(exports2, module2) {
    var crypto = require("crypto");
    function canonical(d) {
      return [
        "v1",
        String(d.title || ""),
        String(d.subtitle || ""),
        String(d.iso || ""),
        Number(d.lat).toFixed(4),
        Number(d.lon).toFixed(4),
        String(d.place || ""),
        String(d.ink || "")
      ].join("|");
    }
    function sign(d, secret) {
      return crypto.createHmac("sha256", secret).update(canonical(d)).digest("hex").slice(0, 24);
    }
    function verify(d, sig, secret) {
      if (!sig || !secret) return false;
      const expected = sign(d, secret);
      const a = Buffer.from(expected);
      const b = Buffer.from(String(sig));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    function encodeDesign(d) {
      return Buffer.from(JSON.stringify(d), "utf8").toString("base64url");
    }
    function decodeDesign(s) {
      return JSON.parse(Buffer.from(String(s), "base64url").toString("utf8"));
    }
    module2.exports = { canonical, sign, verify, encodeDesign, decodeDesign };
  }
});

// lib/fulfill.js
var require_fulfill = __commonJS({
  "lib/fulfill.js"(exports2, module2) {
    var env = require_env();
    var { stripeApi: stripeApi2 } = require_stripe();
    var prodigi2 = require_prodigi();
    var { encodeDesign } = require_sign();
    function publicUrl() {
      return (env.get("PUBLIC_URL") || "http://localhost:3177").replace(/\/$/, "");
    }
    function artUrlFor(design, sig) {
      return publicUrl() + "/api/art?d=" + encodeDesign(design) + "&sig=" + encodeURIComponent(sig);
    }
    async function fulfillSession2(session) {
      const md = session.metadata || {};
      if (session.payment_status !== "paid") {
        return { fulfilled: false, reason: "payment_status=" + session.payment_status };
      }
      if (md.prodigi_order_id) {
        return { fulfilled: true, already: true, prodigiOrderId: md.prodigi_order_id };
      }
      if (!md.design || !md.sig) {
        return { fulfilled: false, reason: "session missing design metadata" };
      }
      let design;
      try {
        design = JSON.parse(md.design);
      } catch (e) {
        return { fulfilled: false, reason: "bad design metadata" };
      }
      const imageUrl = artUrlFor(design, md.sig);
      const recipient = prodigi2.recipientFromSession(session);
      const result = await prodigi2.createShirtOrder({
        merchantReference: session.id,
        recipient,
        sku: md.sku,
        size: md.size,
        color: md.color,
        imageUrl
      });
      const orderId = result && result.order && result.order.id;
      if (orderId) {
        try {
          await stripeApi2("POST", "/v1/checkout/sessions/" + session.id, {
            metadata: { prodigi_order_id: orderId }
          });
        } catch (e) {
          console.error("could not record prodigi order id on session:", e.message);
        }
      }
      return { fulfilled: true, already: false, prodigiOrderId: orderId, prodigiOutcome: result && result.outcome };
    }
    module2.exports = { fulfillSession: fulfillSession2, artUrlFor, publicUrl };
  }
});

// lib/http.js
var require_http = __commonJS({
  "lib/http.js"(exports2, module2) {
    async function readRawBody(req) {
      if (req.rawBody) return req.rawBody;
      return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });
    }
    async function readJsonBody(req) {
      if (req.body && typeof req.body === "object") return req.body;
      const raw = await readRawBody(req);
      if (!raw.length) return {};
      return JSON.parse(raw.toString("utf8"));
    }
    function sendJson2(res, status, obj) {
      const body = JSON.stringify(obj);
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(body);
    }
    module2.exports = { readRawBody, readJsonBody, sendJson: sendJson2 };
  }
});

// src/api/status.js
var { stripeApi } = require_stripe();
var { fulfillSession } = require_fulfill();
var prodigi = require_prodigi();
var { sendJson } = require_http();
module.exports = async (req, res) => {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method not allowed" });
  const sessionId = req.query && req.query.session_id || "";
  if (!/^cs_(test|live)_/.test(sessionId)) return sendJson(res, 400, { error: "bad session id" });
  let session;
  try {
    session = await stripeApi("GET", "/v1/checkout/sessions/" + encodeURIComponent(sessionId));
  } catch (e) {
    return sendJson(res, 404, { error: "session not found" });
  }
  let fulfillment = null;
  if (session.payment_status === "paid") {
    try {
      fulfillment = await fulfillSession(session);
    } catch (e) {
      fulfillment = { fulfilled: false, error: e.message };
    }
  }
  let prodigiStatus = null;
  const orderId = fulfillment && fulfillment.prodigiOrderId;
  if (orderId) {
    try {
      const o = await prodigi.getOrder(orderId);
      prodigiStatus = o && o.order && o.order.status && o.order.status.stage;
    } catch (e) {
      prodigiStatus = "unknown";
    }
  }
  const md = session.metadata || {};
  let design = null;
  try {
    design = md.design ? JSON.parse(md.design) : null;
  } catch (e) {
  }
  return sendJson(res, 200, {
    paymentStatus: session.payment_status,
    fulfillment,
    prodigiOrderId: orderId || null,
    prodigiStatus,
    design: design ? { title: design.title, place: design.place, iso: design.iso } : null
  });
};
