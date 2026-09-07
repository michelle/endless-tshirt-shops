import { redirect } from "next/navigation";
import Link from "next/link";
import { finalizeStripeSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Stripe success URL. Places (or finds) the Prodigi order for the paid session, then jumps to the order page. */
export default async function StripeReturn({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return (
      <div className="narrow">
        <h1>Invalid session</h1>
      </div>
    );
  }
  let result: Awaited<ReturnType<typeof finalizeStripeSession>>;
  try {
    result = await finalizeStripeSession(sessionId);
  } catch (e) {
    return (
      <div className="narrow">
        <h1>We hit a snag</h1>
        <p>
          Your payment went through, but we could not confirm the print order automatically. We have your payment reference and will sort it out; please
          contact us with session <code>{sessionId}</code> if you don&apos;t hear from us.
        </p>
        <p className="muted small">{e instanceof Error ? e.message : String(e)}</p>
        <Link href="/">Back to the parks</Link>
      </div>
    );
  }
  if ("pending" in result) {
    return (
      <div className="narrow">
        <h1>Payment still processing</h1>
        <p>Stripe has not confirmed the payment yet. Refresh this page in a moment.</p>
        <meta httpEquiv="refresh" content="5" />
      </div>
    );
  }
  redirect(`/order/${result.orderId}?t=${encodeURIComponent(result.token)}&paid=1`);
}
