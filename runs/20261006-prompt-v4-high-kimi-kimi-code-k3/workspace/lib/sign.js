const crypto = require("crypto");

// Canonical string for a design payload — order matters, keep stable.
function canonical(d) {
  return [
    "v1",
    String(d.title || ""),
    String(d.subtitle || ""),
    String(d.iso || ""),
    Number(d.lat).toFixed(4),
    Number(d.lon).toFixed(4),
    String(d.place || ""),
    String(d.ink || ""),
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

module.exports = { canonical, sign, verify, encodeDesign, decodeDesign };
