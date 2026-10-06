const env = require("./env");

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
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* leave as text */ }
  if (!res.ok) {
    const err = new Error("Prodigi " + res.status + ": " + text.slice(0, 400));
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

// Map a Stripe checkout session's shipping details to a Prodigi recipient
function recipientFromSession(session) {
  const sd = session.shipping_details || session.customer_details || {};
  const a = sd.address || {};
  const recipient = {
    name: sd.name || (session.customer_details && session.customer_details.name) || "Customer",
    address: {
      line1: a.line1 || "",
      postalOrZipCode: a.postal_code || "",
      countryCode: a.country || "",
      townOrCity: a.city || "",
    },
  };
  const email = (session.customer_details && session.customer_details.email) || session.customer_email;
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
        attributes: { color, size },
      },
    ],
    metadata: { source: "written-in-the-stars" },
  };
  return prodigiApi("POST", "/v4.0/orders", payload);
}

async function getOrder(id) {
  return prodigiApi("GET", "/v4.0/orders/" + encodeURIComponent(id));
}

module.exports = { createShirtOrder, getOrder, recipientFromSession };
