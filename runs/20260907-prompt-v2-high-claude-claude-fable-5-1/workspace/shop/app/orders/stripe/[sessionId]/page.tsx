import { redirect } from "next/navigation";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { fulfilStripeSession } from "@/lib/fulfil";
import { ClearCart } from "@/components/ClearCart";

export const dynamic = "force-dynamic";

// Stripe success URL. The webhook normally creates the Prodigi order; this page creates it too if the
// webhook hasn't landed yet (idempotent on the session id), then redirects to the order page.
export default async function StripeReturn({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!stripeEnabled() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) redirect("/");
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-3xl">Payment pending</h1>
        <p className="mt-3">Your payment hasn&apos;t completed yet. If you paid by a delayed method, we&apos;ll email you once the order is confirmed.</p>
      </div>
    );
  }
  const order = await fulfilStripeSession(session);
  return (
    <>
      <ClearCart />
      <meta httpEquiv="refresh" content={`0;url=/orders/${order.id}?new=1`} />
      <div className="mx-auto max-w-xl px-4 py-16">Confirming your order…</div>
    </>
  );
}
