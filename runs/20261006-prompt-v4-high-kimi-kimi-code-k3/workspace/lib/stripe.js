const env = require("./env");

// Minimal Stripe API client over fetch (avoids the stripe npm dependency in serverless bundles).
async function stripeApi(method, path, params) {
  const key = env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  const opts = {
    method,
    headers: { Authorization: "Bearer " + key },
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

// Stripe's form encoding: nested objects as a[b][c]=v
function encodeParams(obj, prefix, out) {
  out = out || [];
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
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

module.exports = { stripeApi };
