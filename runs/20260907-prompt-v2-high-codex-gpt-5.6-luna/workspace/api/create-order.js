const CATALOG = {
  "signal-moth": {
    name: "Signal Moth Tee",
    sku: "GLOBAL-TEE-BC-3001",
    price: 34,
    asset: "signal-moth.svg"
  },
  "night-shift": {
    name: "Night Shift Tee",
    sku: "GLOBAL-TEE-BC-3001",
    price: 34,
    asset: "night-shift.svg"
  },
  "lunar-garden": {
    name: "Lunar Garden Tee",
    sku: "GLOBAL-TEE-BC-3001",
    price: 36,
    asset: "lunar-garden.svg"
  }
};

const SIZES = new Set(["XS", "S", "M", "L", "XL", "2XL"]);
const COUNTRIES = new Set(["US", "CA", "GB", "AU", "NZ"]);

function response(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

function clean(value, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return response(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.PRODIGI_API_KEY) {
    return response(res, 500, { error: "Prodigi is not configured on this deployment." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const customer = body.customer || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const name = clean(customer.name);
    const email = clean(customer.email, 180);
    const line1 = clean(customer.line1);
    const townOrCity = clean(customer.townOrCity);
    const postalOrZipCode = clean(customer.postalOrZipCode, 24);
    const stateOrCounty = clean(customer.stateOrCounty, 80);
    const countryCode = clean(customer.countryCode, 2).toUpperCase();

    if (!name || !email || !line1 || !townOrCity || !postalOrZipCode || !COUNTRIES.has(countryCode)) {
      return response(res, 400, { error: "Please provide a complete shipping address and a valid country." });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return response(res, 400, { error: "Please provide a valid email address." });
    }
    if (!items.length || items.length > 12) {
      return response(res, 400, { error: "Your cart is empty or too large." });
    }

    const host = req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const origin = `${proto}://${host}`;
    const orderItems = items.map((item, index) => {
      const product = CATALOG[item.productId];
      const size = clean(item.size, 4).toUpperCase();
      const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
      if (!product || !SIZES.has(size)) throw new Error(`Invalid cart item at position ${index + 1}.`);
      const prodigiSize = size.toLowerCase();
      return {
        merchantReference: `${item.productId}-${size}-${index + 1}`,
        sku: product.sku,
        copies: quantity,
        sizing: "fitPrintArea",
        attributes: {
          brand: "Bella + Canvas",
          edge: "Crew neck",
          color: "black",
          gender: "Unisex",
          paperType: "100% cotton",
          size: prodigiSize,
          style: "3001"
        },
        assets: [{ printArea: "front", url: `${origin}/art/${product.asset}` }]
      };
    });

    const prodigiPayload = {
      merchantReference: `MM-${Date.now()}`,
      shippingMethod: "standard",
      recipient: {
        name,
        email,
        address: { line1, townOrCity, stateOrCounty: stateOrCounty || null, postalOrZipCode, countryCode }
      },
      items: orderItems
    };

    const prodigiResponse = await fetch("https://api.sandbox.prodigi.com/v4.0/Orders", {
      method: "POST",
      headers: { "X-API-Key": process.env.PRODIGI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(prodigiPayload)
    });
    const data = await prodigiResponse.json().catch(() => ({}));
    if (!prodigiResponse.ok) {
      return response(res, 502, { error: data?.issues?.[0]?.description || data?.message || "Prodigi could not accept the order.", detail: data?.outcome });
    }
    return response(res, 200, {
      ok: true,
      sandbox: true,
      orderId: data.id || data.order?.id || data.orderId,
      status: data.outcome || data.order?.status || "submitted"
    });
  } catch (error) {
    return response(res, 400, { error: error.message || "We could not create the order." });
  }
};
