import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { fulfillCheckoutSession } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  let state: "submitted" | "waiting" | "unknown" = "unknown";
  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const result = await fulfillCheckoutSession(sessionId);
      state = result.state;
    } catch (error) {
      console.error("success_page_fulfillment_error", error);
    }
  }
  return (
    <main className="success-page">
      <div className="wordmark">SIGNAL <span>✦</span> ATLAS</div>
      <h1>Your signal<br />is received.</h1>
      <div className="success-card">
        <CheckCircle2 size={34} color="#063d89" />
        <h2>Payment confirmed</h2>
        <p>{state === "submitted" ? "Your one-of-one artwork has been sent to our print partner. You’ll receive tracking after production." : "Your payment is confirmed. Your print order is being prepared, and fulfillment will retry automatically if the print network is still responding."}</p>
        <Link href="/">Create another</Link>
      </div>
    </main>
  );
}
