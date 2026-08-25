import type Stripe from "stripe";
import { buildProdigiOrder, createProdigiOrder } from "./prodigi";

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session, fallbackOrigin?: string) {
  if (session.payment_status !== "paid") throw new Error("Cannot fulfill an unpaid Checkout Session");
  const origin = session.metadata?.origin || fallbackOrigin;
  if (!origin || !origin.startsWith("https://")) throw new Error("A secure storefront origin is required for fulfillment");
  const payload = buildProdigiOrder(session, origin.replace(/\/$/, ""));
  return createProdigiOrder(payload);
}
