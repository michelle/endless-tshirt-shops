import type { Metadata } from "next";
import { Checkout } from "@/components/Checkout";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  const paid = Boolean(process.env.STRIPE_SECRET_KEY);
  return (
    <div className="wrap" style={{ padding: "40px 20px 70px" }}>
      <h1 className="title">Checkout</h1>
      {!paid && (
        <p className="notice" style={{ margin: "10px 0 24px" }}>
          <strong>No payment provider is connected.</strong> Placing an order here sends a real
          request to the Prodigi <em>sandbox</em> and charges nothing. Set <code>STRIPE_SECRET_KEY</code>{" "}
          to switch checkout to Stripe.
        </p>
      )}
      <Checkout />
    </div>
  );
}
