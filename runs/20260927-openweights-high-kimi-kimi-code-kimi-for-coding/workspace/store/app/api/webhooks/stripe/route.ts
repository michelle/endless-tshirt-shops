import { getStripe } from "@/lib/stripe";
import {
  colorById,
  sanitizeDesign,
  SKU,
  type DesignInput,
} from "@/lib/design";
import {
  createProdigiOrder,
  findOrderByMerchantReference,
} from "@/lib/prodigi";
import { artworkQueryString } from "@/lib/artwork";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as any;
    if (session.payment_status === "paid") {
      try {
        await submitToProdigi(session, request);
      } catch (err) {
        console.error("Prodigi submit failed:", err);
        return new Response("prodigi error", { status: 500 });
      }
    }
  }
  return Response.json({ received: true });
}

export const maxDuration = 60;

async function submitToProdigi(session: any, request: Request) {
  const m = session.metadata ?? {};
  if (m.store !== "definingme-v1") {
    console.log("Ignoring session from another app:", session.id);
    return;
  }
  const design = sanitizeDesign(m);
  const color = colorById(design.color);

  const existing = await findOrderByMerchantReference(session.id);
  if (existing) {
    console.log("Prodigi order already exists for", session.id, "->", existing.id);
    return;
  }

  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const artworkUrl = `${proto}://${host}/api/artwork.png?${artworkQueryString(design)}`;

  const anySession = session as any;
  const ship =
    anySession.shipping_details ??
    anySession.collected_information?.shipping_details ??
    {};
  const addr = ship.address ?? {};
  const name = ship.name ?? session.customer_details?.name;
  if (!name || !addr.line1 || !addr.city || !addr.postal_code || !addr.country) {
    throw new Error("Checkout session is missing shipping details");
  }

  const payload = {
    merchantReference: session.id,
    shippingMethod: "Standard",
    recipient: {
      name,
      email: session.customer_details?.email ?? undefined,
      phoneNumber:
        session.customer_details?.phone ?? ship.phone ?? undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        townOrCity: addr.city,
        stateOrCounty: addr.state ?? undefined,
        postalOrZipCode: addr.postal_code,
        countryCode: addr.country,
      },
    },
    items: [
      {
        sku: SKU,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: { size: design.size, color: color.prodigi },
        assets: [{ printArea: "front", url: artworkUrl }],
      },
    ],
  };

  const result = await createProdigiOrder(payload, session.id);
  console.log(
    "Prodigi create order outcome:",
    result?.outcome,
    "id:",
    result?.order?.id ?? result?.id
  );
  if (
    result?.outcome &&
    result.outcome !== "Created" &&
    result.outcome !== "CreatedWithIssues"
  ) {
    throw new Error(
      `Prodigi rejected order: ${JSON.stringify(result).slice(0, 500)}`
    );
  }
}
