import { ShippingAddress, GarmentColor, ShirtSize } from './types';

const PRODIGI_BASE_URL = 'https://api.sandbox.prodigi.com/v4.0';

export interface CreateOrderParams {
  orderReference: string;
  recipient: ShippingAddress;
  garmentColor: GarmentColor;
  size: ShirtSize;
  assetUrl: string;
}

export async function createProdigiOrder(params: CreateOrderParams) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) {
    throw new Error('PRODIGI_API_KEY is not defined in the environment.');
  }

  // Ensure attributes match Prodigi's exact specification
  let prodigiColor: string = params.garmentColor;
  if (prodigiColor === 'navy blue' || prodigiColor === 'navy') {
    prodigiColor = 'navy blue';
  } else if (prodigiColor === 'black') {
    prodigiColor = 'black';
  } else if (prodigiColor === 'white') {
    prodigiColor = 'white';
  } else if (prodigiColor === 'natural') {
    prodigiColor = 'natural';
  }

  const payload = {
    merchantReference: params.orderReference,
    shippingMethod: 'Standard',
    recipient: {
      name: params.recipient.name,
      email: params.recipient.email,
      address: {
        line1: params.recipient.line1,
        line2: params.recipient.line2 || undefined,
        postalOrZipCode: params.recipient.postalCode,
        countryCode: params.recipient.country.toUpperCase(),
        townOrCity: params.recipient.city,
        stateOrCounty: params.recipient.state
      }
    },
    items: [
      {
        merchantReference: `item-${params.orderReference}`,
        sku: 'GLOBAL-TEE-BC-3001',
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: {
          color: prodigiColor,
          size: params.size.toLowerCase()
        },
        assets: [
          {
            printArea: 'front',
            url: params.assetUrl
          }
        ]
      }
    ]
  };

  const response = await fetch(`${PRODIGI_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Prodigi API error (${response.status}): ${JSON.stringify(data)}`
    );
  }

  return data;
}

export async function getProdigiOrder(orderId: string) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) {
    throw new Error('PRODIGI_API_KEY is not defined in the environment.');
  }

  const response = await fetch(`${PRODIGI_BASE_URL}/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Prodigi order ${orderId}: ${JSON.stringify(data)}`
    );
  }

  return data;
}
