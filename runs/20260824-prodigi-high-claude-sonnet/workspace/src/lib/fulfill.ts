import type Stripe from "stripe";
import { createProdigiOrder, ProdigiError, type ProdigiRecipient } from "@/lib/prodigi";
import { isShirtColor, isShirtSize, isShirtStyle } from "@/lib/product";

export type FulfillResult =
  | { status: "unpaid" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      prodigiOrderId: string;
      prodigiStage: string;
      artworkUrl: string;
      style: string;
      size: string;
      color: string;
      orderedAtMs: number;
      amountTotal: number | null;
      currency: string | null;
      recipientName: string;
    };

function mapAddress(
  address: Stripe.Address | null | undefined,
  name: string | null | undefined
): ProdigiRecipient["address"] | null {
  if (!address || !address.line1 || !address.city || !address.postal_code || !address.country) {
    return null;
  }
  return {
    line1: address.line1,
    line2: address.line2 ?? undefined,
    townOrCity: address.city,
    stateOrCounty: address.state ?? undefined,
    postalOrZipCode: address.postal_code,
    countryCode: address.country,
  };
}

export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
  origin: string
): Promise<FulfillResult> {
  if (session.payment_status !== "paid") {
    return { status: "unpaid" };
  }

  const { style, size, color } = session.metadata ?? {};
  if (!isShirtStyle(style) || !isShirtSize(size) || !isShirtColor(color)) {
    return { status: "error", message: "Missing or invalid product metadata on session." };
  }

  const shipping = session.collected_information?.shipping_details ?? null;
  const customer = session.customer_details ?? null;

  const recipientName = shipping?.name || customer?.name || customer?.email || "datetime.store customer";
  const address = mapAddress(shipping?.address, shipping?.name) ?? mapAddress(customer?.address, customer?.name);

  if (!address) {
    return { status: "error", message: "No shipping address was collected for this session." };
  }

  const orderedAtMs = session.created * 1000;
  const artworkUrl = `${origin}/api/artwork?ts=${orderedAtMs}&color=${color}`;

  try {
    const order = await createProdigiOrder({
      merchantReference: session.id,
      idempotencyKey: `fulfill_${session.id}`,
      recipient: {
        name: recipientName,
        email: customer?.email ?? undefined,
        phoneNumber: customer?.phone ?? undefined,
        address,
      },
      style,
      size,
      color,
      artworkUrl,
    });

    return {
      status: "ok",
      prodigiOrderId: order.id,
      prodigiStage: order.status?.stage ?? "unknown",
      artworkUrl,
      style,
      size,
      color,
      orderedAtMs,
      amountTotal: session.amount_total,
      currency: session.currency,
      recipientName,
    };
  } catch (err) {
    if (err instanceof ProdigiError) {
      console.error("Prodigi order creation failed", JSON.stringify(err.details));
      return { status: "error", message: err.message };
    }
    console.error("Unexpected fulfillment error", err);
    return { status: "error", message: "Unexpected error while creating the print order." };
  }
}
