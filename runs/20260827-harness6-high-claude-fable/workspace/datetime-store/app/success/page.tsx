import Link from "next/link";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import RefreshUntilFulfilled from "@/components/RefreshUntilFulfilled";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return (
      <main className="container">
        <div className="success">
          <p className="success-title">Hmm, we couldn’t find that order.</p>
          <Link className="again" href="/">
            ← Back to the store
          </Link>
        </div>
      </main>
    );
  }

  let session: Stripe.Checkout.Session | null = null;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
  } catch {
    session = null;
  }

  if (!session || session.payment_status !== "paid") {
    return (
      <main className="container">
        <div className="success">
          <p className="success-title">
            That order doesn’t appear to be paid yet.
          </p>
          <p>If you just checked out, give it a moment and refresh.</p>
          <Link className="again" href="/">
            ← Back to the store
          </Link>
        </div>
      </main>
    );
  }

  const ts = session.metadata?.ts ?? null;
  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const prodigiOrderId = pi?.metadata?.prodigi_order_id ?? null;
  const email = session.customer_details?.email;

  return (
    <main className="container">
      <header className="page-header">
        <h1>datetime.store</h1>
      </header>
      <div className="success">
        <p className="success-title">Congrats on your pretty cool shirt! 🎉</p>
        <p>Your moment, frozen forever:</p>
        {ts ? <div className="success-ts">{ts}</div> : null}
        <p>
          {email
            ? `A receipt is on its way to ${email}.`
            : "A receipt is on its way to your email."}
        </p>
        {prodigiOrderId ? (
          <p className="success-meta">
            Print order <strong>{prodigiOrderId}</strong> has been placed with
            our fulfillment partner. 📦 Free shipping — allow 5–10 business
            days.
          </p>
        ) : (
          <p className="success-meta">
            Your print order is being placed with our fulfillment partner…
          </p>
        )}
        <RefreshUntilFulfilled fulfilled={Boolean(prodigiOrderId)} />
        <Link className="again" href="/">
          ♥ Get another shirt
        </Link>
      </div>
    </main>
  );
}
