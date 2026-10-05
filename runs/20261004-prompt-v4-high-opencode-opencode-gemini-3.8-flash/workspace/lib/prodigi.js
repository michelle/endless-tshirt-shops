// lib/prodigi.js
// Prodigi Print API v4 integration for automated DTG t-shirt printing.

const PRODIGI_API_URL = "https://api.sandbox.prodigi.com/v4.0";

function normalizeString(val) {
  if (val === undefined || val === null) return null;
  const trimmed = String(val).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class ProdigiClient {
  constructor(apiKey = process.env.PRODIGI_API_KEY) {
    if (!apiKey) {
      throw new Error("PRODIGI_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
  }

  async createOrder({
    orderReference,
    recipient,
    color = "black",
    size = "l",
    assetUrl,
    idempotencyKey
  }) {
    if (!assetUrl) throw new Error("assetUrl is required for Prodigi order");
    if (!recipient || !recipient.name) throw new Error("recipient with name is required");

    // Standardize garment color and size to lowercase
    const normalizedColor = (color || "black").toLowerCase().trim();
    const normalizedSize = (size || "l").toLowerCase().trim();

    // Prodigi Bella + Canvas 3001 valid colors include:
    // black, navy blue, asphalt, dark heather grey, white, athletic grey heather
    const colorMap = {
      "black": "black",
      "navy": "navy blue",
      "navy blue": "navy blue",
      "asphalt": "asphalt",
      "charcoal": "asphalt",
      "dark heather grey": "dark heather grey",
      "grey": "athletic grey heather",
      "white": "white"
    };
    const mappedColor = colorMap[normalizedColor] || "black";

    const payload = {
      merchantReference: orderReference,
      idempotencyKey: idempotencyKey || orderReference,
      shippingMethod: "Standard",
      recipient: {
        name: recipient.name,
        email: normalizeString(recipient.email),
        phoneNumber: normalizeString(recipient.phoneNumber),
        address: {
          line1: recipient.address?.line1 || recipient.address?.line_1 || "1 Main St",
          line2: normalizeString(recipient.address?.line2 || recipient.address?.line_2),
          postalOrZipCode: recipient.address?.postalOrZipCode || recipient.address?.postal_code || recipient.address?.zip || "10001",
          countryCode: (recipient.address?.countryCode || recipient.address?.country || "US").toUpperCase(),
          townOrCity: recipient.address?.townOrCity || recipient.address?.city || "New York",
          stateOrCounty: normalizeString(recipient.address?.stateOrCounty || recipient.address?.state)
        }
      },
      items: [
        {
          merchantReference: `${orderReference}-item`,
          sku: "GLOBAL-TEE-BC-3001",
          copies: 1,
          sizing: "fillPrintArea",
          attributes: {
            color: mappedColor,
            size: normalizedSize
          },
          assets: [
            {
              printArea: "front",
              url: assetUrl
            }
          ]
        }
      ]
    };

    const res = await fetch(`${PRODIGI_API_URL}/orders`, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok && data.outcome !== "AlreadyExists") {
      throw new Error(`Prodigi order error HTTP ${res.status}: ${JSON.stringify(data)}`);
    }

    return data;
  }

  async getOrder(orderId) {
    const res = await fetch(`${PRODIGI_API_URL}/orders/${orderId}`, {
      method: "GET",
      headers: {
        "X-API-Key": this.apiKey
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Prodigi order ${orderId}: HTTP ${res.status}`);
    }

    return await res.json();
  }
}
