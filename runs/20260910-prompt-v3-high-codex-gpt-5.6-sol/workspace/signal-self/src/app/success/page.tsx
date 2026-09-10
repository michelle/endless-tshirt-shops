import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  let paid = false;
  let reference = "";
  if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === "paid";
      reference = session.id.slice(-10).toUpperCase();
    } catch { /* Render a safe pending state. */ }
  }

  return (
    <main className="success-page">
      <div className="success-card">
        <div className={paid ? "success-icon paid" : "success-icon"}><CheckCircle2 size={34} /></div>
        <p className="eyebrow">{paid ? "Payment confirmed" : "Checking payment"}</p>
        <h1>{paid ? "Your signal is in motion." : "We’re confirming your order."}</h1>
        <p>{paid ? "Your one-of-one print has been queued with our print partner. You’ll receive Stripe’s receipt by email." : "If you just paid, this normally takes a few seconds. Your shirt won’t be printed until payment is confirmed."}</p>
        {reference && <div className="order-reference"><span>Order reference</span><strong>{reference}</strong></div>}
        <Link href="/">Create another signal</Link>
      </div>
    </main>
  );
}
