import { NextResponse } from "next/server";
import { getProduct } from "@/lib/products";

export const runtime = "nodejs";

const PRODIGI_BASE = "https://api.sandbox.prodigi.com/v4.0";
const SKU = "GLOBAL-TEE-GIL-64000";

interface CheckoutItem {
  slug: string;
  size: string;
  color: string;
  qty: number;
}

interface CheckoutBody {
  items: CheckoutItem[];
  shippingMethod?: string;
  recipient: {
    name: string;
    email?: string;
    phone?: string;
    line1: string;
    line2?: string;
    townOrCity: string;
    stateOrCounty?: string;
    postalOrZipCode: string;
    countryCode: string;
  };
}

export async function POST(req: Request) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing PRODIGI_API_KEY. Set it in your Vercel project's environment variables." },
      { status: 500 }
    );
  }

  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.items?.length) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }
  const r = body.recipient;
  if (!r?.name || !r.line1 || !r.townOrCity || !r.postalOrZipCode || !r.countryCode) {
    return NextResponse.json({ error: "Missing required shipping address fields." }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const shippingMethod = body.shippingMethod ?? "Standard";

  const prodigiItems = body.items.map((it) => {
    const product = getProduct(it.slug);
    return {
      sku: SKU,
      copies: it.qty,
      sizing: "fitPrintArea",
      attributes: { color: it.color, size: it.size },
      assets: [
        {
          printArea: "front",
          url: `${origin}/api/art/${it.slug}?w=2000`,
        },
      ],
      merchantReference: product?.name ?? it.slug,
    };
  });

  const recipient = {
    name: r.name,
    email: r.email || undefined,
    phoneNumber: r.phone || undefined,
    address: {
      line1: r.line1,
      line2: r.line2 || undefined,
      postalOrZipCode: r.postalOrZipCode,
      countryCode: r.countryCode.toUpperCase(),
      townOrCity: r.townOrCity,
      stateOrCounty: r.stateOrCounty || undefined,
    },
  };

  // 1. Get a live quote so the customer sees real print + shipping costs.
  let quote: unknown = null;
  try {
    const quoteRes = await fetch(`${PRODIGI_BASE}/quotes`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        shippingMethod,
        destinationCountryCode: recipient.address.countryCode,
        currencyCode: "USD",
        items: prodigiItems.map(({ sku, copies, attributes, assets }) => ({
          sku,
          copies,
          attributes,
          assets: assets.map((a) => ({ printArea: a.printArea })),
        })),
      }),
    });
    quote = await quoteRes.json();
  } catch (err) {
    quote = { error: String(err) };
  }

  // 2. Create the real (sandbox) order with Prodigi so it flows through
  //    their print & fulfillment pipeline.
  let order: unknown;
  let orderRes: Response;
  try {
    orderRes = await fetch(`${PRODIGI_BASE}/Orders`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        shippingMethod,
        recipient,
        items: prodigiItems,
      }),
    });
    order = await orderRes.json();
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach Prodigi: ${String(err)}`, quote },
      { status: 502 }
    );
  }

  if (!orderRes.ok) {
    return NextResponse.json({ error: "Prodigi rejected the order.", details: order, quote }, { status: 422 });
  }

  return NextResponse.json({ order, quote });
}
