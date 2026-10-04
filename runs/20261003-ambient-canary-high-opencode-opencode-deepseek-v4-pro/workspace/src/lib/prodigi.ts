// Prodigi Print API integration. Orders are only created after payment succeeds.

import { PRODIGI_SKU, colorById, sizeById, type Customization } from "./config";

const PRODIGI_BASE = "https://api.sandbox.prodigi.com/v4.0";

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  email?: string;
}

export interface ProdigiOrderResult {
  id: string;
  status: string;
  merchantReference: string;
}

/**
 * Submit a single customized tee to Prodigi for DTG printing and fulfillment.
 * The uploaded pet portrait is passed as the `front` print-area asset.
 */
export async function createProdigiOrder(
  customization: Customization,
  shipping: ShippingAddress,
  merchantReference: string,
): Promise<ProdigiOrderResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not configured");

  const color = colorById(customization.color);
  const size = sizeById(customization.size);

  const payload = {
    merchantReference,
    shippingMethod: "Standard",
    recipient: {
      name: shipping.name,
      email: shipping.email,
      address: {
        line1: shipping.line1,
        line2: shipping.line2 || undefined,
        postalOrZipCode: shipping.postalCode,
        countryCode: shipping.country,
        townOrCity: shipping.city,
        stateOrCounty: shipping.state || undefined,
      },
    },
    items: [
      {
        merchantReference: `${merchantReference}-item-1`,
        sku: PRODIGI_SKU,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: {
          color: color.prodigi,
          size: size.prodigi,
        },
        recipientCost: {
          amount: "29.99",
          currency: "USD",
        },
        assets: [
          {
            printArea: "front",
            url: customization.imageUrl,
          },
        ],
      },
    ],
    metadata: {
      brand: "Pawtraits",
      style: customization.style,
      petName: customization.petName,
      source: "pawtraits-store",
    },
  };

  const res = await fetch(`${PRODIGI_BASE}/Orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `Prodigi order failed (${res.status}): ${JSON.stringify(body)}`,
    );
  }

  return {
    id: body.order?.id ?? "",
    status: body.outcome ?? "Unknown",
    merchantReference,
  };
}
