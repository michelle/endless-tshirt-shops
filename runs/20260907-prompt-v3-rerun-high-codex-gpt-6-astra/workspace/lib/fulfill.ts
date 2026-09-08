import type Stripe from "stripe";
import { designSchema, PRICE, SHIPPING } from "./design";
import { artworkToken } from "./art-token";
import { stripeClient, origin, mode } from "./config";
import { item, prodigi } from "./prodigi";
export function validatePaidSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return false;
  if (
    session.mode !== "payment" ||
    session.currency !== "usd" ||
    session.amount_total !== PRICE + SHIPPING ||
    session.metadata?.store !== "field-notes-v1" ||
    session.livemode !== (mode() === "live")
  )
    throw new Error("Order payment validation failed");
  return true;
}
type Dependencies = {
  retrieve: (id: string) => Promise<Stripe.Checkout.Session>;
  record: (id: string, metadata: Record<string, string>) => Promise<unknown>;
  print: typeof prodigi;
};
export async function fulfill(
  sessionId: string,
  deps: Dependencies = {
    retrieve: (id) => stripeClient().checkout.sessions.retrieve(id),
    record: (id, metadata) =>
      stripeClient().checkout.sessions.update(id, { metadata }),
    print: prodigi,
  },
) {
  const session = await deps.retrieve(sessionId);
  if (!validatePaidSession(session))
    return { paid: false, status: "Awaiting payment" };
  if (session.metadata?.prodigi_order_id)
    return {
      paid: true,
      status: "Sent to print partner",
      orderId: session.metadata.prodigi_order_id,
      session,
    };
  const design = designSchema.parse(
    JSON.parse(session.metadata?.design || "{}"),
  );
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  if (
    !shipping?.name ||
    !address?.line1 ||
    !address?.postal_code ||
    !address.city ||
    address.country !== "US"
  )
    throw new Error("Valid US shipping address required");
  const token = artworkToken(design);
  const response = await deps.print("orders", {
    merchantReference: session.id,
    idempotencyKey: "field-notes-v1-" + session.id,
    shippingMethod: "Standard",
    recipient: {
      name: shipping.name,
      email: session.customer_details?.email,
      phoneNumber: session.customer_details?.phone,
      address: {
        line1: address.line1,
        line2: address.line2 || "",
        postalOrZipCode: address.postal_code,
        countryCode: address.country,
        townOrCity: address.city,
        stateOrCounty: address.state || "",
      },
    },
    items: [
      item(
        design,
        origin() + "/api/artwork?token=" + encodeURIComponent(token),
      ),
    ],
    metadata: { stripeSession: session.id, store: "field-notes-v1" },
  });
  if (!response.order?.id)
    throw new Error("Print provider did not acknowledge order");
  await deps.record(session.id, {
    prodigi_order_id: response.order.id,
    fulfillment_outcome: response.outcome,
  });
  return {
    paid: true,
    status: "Sent to print partner",
    orderId: response.order.id,
    session,
  };
}
