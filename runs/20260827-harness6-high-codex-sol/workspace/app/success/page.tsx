import Link from "next/link";
import { fulfillCheckoutSession } from "@/lib/prodigi";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  let timestamp = "your moment";
  let orderId = "";
  let paid = false;
  let fulfillmentPending = false;

  if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === "paid";
      timestamp = session.metadata?.timestamp || timestamp;
      if (paid) {
        const result = await fulfillCheckoutSession(session);
        orderId = result.orderId;
      }
    } catch {
      fulfillmentPending = paid;
    }
  }

  return (
    <main className="success-shell">
      <Link className="brand" href="/">datetime.store</Link>
      <section className="success-card">
        <p className="eyebrow">{paid ? "MOMENT CAPTURED" : "CHECKOUT STATUS"}</p>
        <div className="success-mark" aria-hidden="true">✓</div>
        <h1>{paid ? "That moment is yours." : "We’re checking your payment."}</h1>
        <p>{paid ? <>Your one-of-one timestamp tee is now in the print queue. We’ll send tracking to the email from checkout.</> : <>Your payment hasn’t completed yet. If you just paid, refresh this page in a moment.</>}</p>
        <div className="receipt-row"><span>TIMESTAMP</span><strong>{timestamp}</strong></div>
        {orderId && <div className="receipt-row"><span>PRODIGI ORDER</span><strong>{orderId}</strong></div>}
        {fulfillmentPending && <p className="pending-note">Payment succeeded. Fulfillment will retry automatically from Stripe.</p>}
        <Link className="secondary-button" href="/">Capture another moment →</Link>
      </section>
      <p className="sandbox-footnote">Sandbox order only — nothing will be printed or charged.</p>
    </main>
  );
}
