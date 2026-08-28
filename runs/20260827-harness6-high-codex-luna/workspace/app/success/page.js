import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="status-page">
      <div className="status-card">
        <span className="status-check">✓</span>
        <p className="eyebrow">order received</p>
        <h1>Your moment<br /><em>is on its way.</em></h1>
        <p>Stripe confirmed your payment. We’ve sent your timestamp tee to Prodigi for printing, and your receipt is on its way by email.</p>
        <Link className="text-link" href="/">back to the store <span>→</span></Link>
      </div>
    </main>
  );
}
