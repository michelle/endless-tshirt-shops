import Link from "next/link";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  let paid = false;
  let fulfillmentId = "";
  let email = "";

  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === "paid";
      fulfillmentId = session.metadata?.prodigi_order_id || "";
      email = session.customer_details?.email || "";
    } catch {
      paid = false;
    }
  }

  return (
    <main className="success-page">
      <Link className="wordmark" href="/">ORBIT<span>/</span>ONE</Link>
      <section className="success-card">
        <p className="eyebrow"><span /> {paid ? "PAYMENT RECEIVED" : "ORDER STATUS"}</p>
        <h1>{paid ? <>Your orbit is<br /><em>taking shape.</em></> : <>We’re checking<br /><em>your payment.</em></>}</h1>
        <p>{paid ? `Your personalized artwork is locked and ${fulfillmentId ? "has entered the print queue" : "is being prepared for the print queue"}. ${email ? `A receipt was sent to ${email}.` : "You’ll receive a receipt by email."}` : "We couldn’t confirm a paid order from this link. If you completed payment, check your receipt or try this page again in a moment."}</p>
        {fulfillmentId && <div className="order-reference"><span>FULFILLMENT REFERENCE</span><strong>{fulfillmentId}</strong></div>}
        <Link className="button button-lime" href="/">Create another <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
