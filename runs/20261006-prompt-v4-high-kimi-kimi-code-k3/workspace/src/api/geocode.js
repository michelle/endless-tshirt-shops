const { sendJson } = require("../../lib/http");

// GET /api/geocode?q=paris → up to 5 places via OpenStreetMap Nominatim.
module.exports = async (req, res) => {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method not allowed" });
  const q = String((req.query && req.query.q) || "").trim();
  if (q.length < 2) return sendJson(res, 200, { results: [] });

  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=" +
      encodeURIComponent(q);
    const r = await fetch(url, {
      headers: { "User-Agent": "written-in-the-stars-tshirt-demo/1.0 (sandbox storefront)" },
    });
    const arr = await r.json();
    const results = (Array.isArray(arr) ? arr : []).map((p) => ({
      name: p.display_name.split(",").slice(0, 3).join(","),
      lat: Number(p.lat),
      lon: Number(p.lon),
    }));
    res.setHeader("Cache-Control", "public, max-age=86400");
    return sendJson(res, 200, { results });
  } catch (e) {
    return sendJson(res, 502, { error: "geocoding unavailable" });
  }
};
