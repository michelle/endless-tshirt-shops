import Link from "next/link";
import { fulfillPaidSession } from "@/lib/fulfillment";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const sessionId = (await searchParams).session_id;
  let result: Awaited<ReturnType<typeof fulfillPaidSession>> | null = null;
  let failed = false;

  if (sessionId?.startsWith("cs_")) {
    try { result = await fulfillPaidSession(await getStripe().checkout.sessions.retrieve(sessionId)); }
    catch (error) { failed = true; console.error("Order confirmation failed", error); }
  } else { failed = true; }

  return (
    <main className="status-page">
      <Link className="brand" href="/">STATUS<span>/</span>WEAR</Link>
      <div className="status-panel">
        <span className="status-code">{failed ? "500" : "201"}</span>
        <p className="eyebrow">[ {failed ? "ORDER NEEDS ATTENTION" : "ORDER CREATED"} ]</p>
        <h1>{failed ? "THE REQUEST LANDED. THE HANDOFF DIDN’T." : "YOU’RE IN THE QUEUE."}</h1>
        <p>{failed ? "Your payment status could not be connected to the print order. No duplicate order will be created; contact the store with your Stripe receipt." : `${result?.productName}, size ${result?.size}, is now a Prodigi sandbox order.`}</p>
        {result && <dl><div><dt>PRODIGI ORDER</dt><dd>{result.prodigiOrderId}</dd></div><div><dt>STATUS</dt><dd>{result.outcome.toUpperCase()}</dd></div></dl>}
        <Link className="back-link" href="/">← BACK TO THE DROP</Link>
      </div>
    </main>
  );
}
