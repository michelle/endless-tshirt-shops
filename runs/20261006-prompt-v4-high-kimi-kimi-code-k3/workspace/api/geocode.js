var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

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

// src/api/geocode.js
var { sendJson } = require_http();
module.exports = async (req, res) => {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method not allowed" });
  const q = String(req.query && req.query.q || "").trim();
  if (q.length < 2) return sendJson(res, 200, { results: [] });
  try {
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=" + encodeURIComponent(q);
    const r = await fetch(url, {
      headers: { "User-Agent": "written-in-the-stars-tshirt-demo/1.0 (sandbox storefront)" }
    });
    const arr = await r.json();
    const results = (Array.isArray(arr) ? arr : []).map((p) => ({
      name: p.display_name.split(",").slice(0, 3).join(","),
      lat: Number(p.lat),
      lon: Number(p.lon)
    }));
    res.setHeader("Cache-Control", "public, max-age=86400");
    return sendJson(res, 200, { results });
  } catch (e) {
    return sendJson(res, 502, { error: "geocoding unavailable" });
  }
};
