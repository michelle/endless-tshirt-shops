import Link from "next/link";
import { getStripe } from "../../lib/stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  let timestamp: string | undefined;
  let orderId: string | undefined;
  let paid = false;

  if (sessionId?.startsWith("cs_")) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
      timestamp = session.metadata?.timestamp;
      orderId = session.metadata?.prodigi_order_id;
    } catch {
      // A generic confirmation is safer than leaking provider errors to the buyer.
    }
  }

  return (
    <main className="success-page">
      <div className="success-card">
        <div className="success-mark" aria-hidden="true">✓</div>
        <p className="kicker">{paid ? "Payment confirmed" : "Order received"}</p>
        <h1>Your moment<br /><em>is yours.</em></h1>
        {timestamp ? <p className="success-timestamp">{timestamp}</p> : null}
        <p className="lede">We’re preparing your exact-time tee. Stripe has sent a receipt to the email used at checkout.</p>
        {orderId ? <p className="order-reference">Fulfillment reference: {orderId}</p> : <p className="order-reference">Fulfillment is being queued now.</p>}
        <Link className="checkout-button success-link" href="/"><span>Capture another moment</span><span aria-hidden="true">↗</span></Link>
      </div>
    </main>
  );
}
