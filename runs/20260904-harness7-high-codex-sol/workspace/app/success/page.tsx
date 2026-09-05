import Link from "next/link";
import { Check, PackageCheck } from "lucide-react";
import { fulfillCheckoutSession } from "../../lib/prodigi";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  let result: Awaited<ReturnType<typeof fulfillCheckoutSession>> | null = null;
  let failed = false;
  if (sessionId) {
    try { result = await fulfillCheckoutSession(sessionId); }
    catch (error) { failed = true; console.error("Success-page fulfillment failed", error); }
  } else { failed = true; }

  return (
    <main className="success-page">
      <Link className="wordmark" href="/">datetime<span>.store</span></Link>
      <section className="success-card">
        <div className={failed ? "success-icon pending" : "success-icon"}>{failed ? <PackageCheck /> : <Check />}</div>
        <p className="section-no">ORDER CONFIRMATION</p>
        <h1>{failed ? "Payment received." : "Your moment is official."}</h1>
        <p className="success-lede">{failed ? "Your receipt is on its way. Fulfillment is still syncing and will be retried automatically." : `Timestamp ${result?.timestamp} is now queued for print in Prodigi’s sandbox.`}</p>
        {result && <dl className="receipt">
          <div><dt>Timestamp</dt><dd>{result.timestamp}</dd></div>
          <div><dt>Size</dt><dd>{result.size}</dd></div>
          <div><dt>Prodigi order</dt><dd>{result.orderId}</dd></div>
          <div><dt>Status</dt><dd>{result.stage || result.outcome}</dd></div>
        </dl>}
        <Link className="home-button" href="/">Catch another moment</Link>
      </section>
    </main>
  );
}
