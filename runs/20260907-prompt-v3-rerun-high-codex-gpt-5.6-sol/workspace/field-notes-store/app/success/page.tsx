import Link from "next/link";
import { Check, MapPin } from "lucide-react";
import { getStripe } from "@/lib/stripe";

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function SuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;
  let paid = false;
  let email = "";
  let place = "your place";
  let orderId = "";

  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === "paid";
      email = session.customer_details?.email || "";
      place = session.metadata?.place || place;
      orderId = session.metadata?.prodigi_order_id || "";
    } catch {
      // Keep the page private and generic when an unknown session is supplied.
    }
  }

  return (
    <main className="success-page">
      <Link className="brand" href="/"><span className="brand-mark"><MapPin size={16} /></span>FIELDMARK</Link>
      <section className="success-card">
        <div className={`success-icon ${paid ? "paid" : ""}`}><Check size={28} /></div>
        <p className="eyebrow">{paid ? "PAYMENT RECEIVED" : "ORDER STATUS"}</p>
        <h1>{paid ? "Your place is going to print." : "We’re checking your payment."}</h1>
        <p>{paid ? `Your one-of-one ${place} field shirt is secured. ${email ? `A receipt is on its way to ${email}.` : "A receipt is on its way."}` : "Refresh this page in a moment. We only send artwork to production after payment clears."}</p>
        <div className="success-details">
          <div><span>FULFILLMENT</span><strong>{orderId ? "Sent to print partner" : paid ? "Being prepared" : "Waiting for payment"}</strong></div>
          {orderId && <div><span>ORDER REF</span><strong>{orderId}</strong></div>}
        </div>
        <Link href="/" className="checkout-button"><span>Make another field shirt</span><span>→</span></Link>
      </section>
    </main>
  );
}
