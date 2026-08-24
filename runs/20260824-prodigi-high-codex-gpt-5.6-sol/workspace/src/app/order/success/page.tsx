import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { fulfillCheckoutSession } from "@/lib/prodigi";
import { shirtConfig, type ShirtStyle } from "@/lib/products";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your moment is yours — datetime.store", robots: { index: false } };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  let result:
    | { ok: true; orderId: string; timestamp: string; style: string; size: string; email: string }
    | { ok: false; paid: boolean } = { ok: false, paid: false };

  if (sessionId?.startsWith("cs_")) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        const fulfillment = await fulfillCheckoutSession(sessionId);
        result = {
          ok: true,
          orderId: fulfillment.orderId,
          timestamp: session.metadata?.timestamp ?? "your timestamp",
          style: shirtConfig[session.metadata?.style as ShirtStyle]?.label ?? "Black",
          size: session.metadata?.size ?? "",
          email: session.customer_details?.email ?? "your email",
        };
      }
    } catch (error) {
      console.error("Order confirmation recovery failed", { sessionId, error });
      try {
        const session = await stripe().checkout.sessions.retrieve(sessionId);
        result = { ok: false, paid: session.payment_status === "paid" };
      } catch {
        result = { ok: false, paid: false };
      }
    }
  }

  return (
    <main className="success-shell">
      <header className="site-header"><Logo /></header>
      <section className="success-card">
        {result.ok ? (
          <>
            <div className="success-icon" aria-hidden="true">✓</div>
            <p className="eyebrow">Order confirmed</p>
            <h1>Your moment<br />is officially yours.</h1>
            <div className="confirmation-number">{result.timestamp}</div>
            <p className="success-copy">
              This order is attached to <strong>{result.email}</strong>. Your made-to-order
              shirt is now in the production queue.
            </p>
            <dl>
              <div><dt>Shirt</dt><dd>{result.style} · {result.size}</dd></div>
              <div><dt>Fulfillment</dt><dd>{result.orderId}</dd></div>
              <div><dt>Shipping</dt><dd>5–10 business days</dd></div>
            </dl>
          </>
        ) : (
          <>
            <p className="eyebrow">{result.paid ? "Payment received" : "We couldn’t find that order"}</p>
            <h1>{result.paid ? "Your order needs a quick review." : "That link has expired."}</h1>
            <p className="success-copy">
              {result.paid
                ? "Your payment is safe, but automatic fulfillment needs attention. Keep your Stripe receipt for support."
                : "Return to the shop to choose a new moment. You have not been charged from this page."}
            </p>
          </>
        )}
        <Link className="back-link" href="/">← Back to datetime.store</Link>
      </section>
    </main>
  );
}
