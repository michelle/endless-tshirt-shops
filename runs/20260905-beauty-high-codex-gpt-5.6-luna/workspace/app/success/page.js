export default function SuccessPage({ searchParams }) {
  const isDemo = searchParams?.demo === "1";
  return (
    <main className="status-page">
      <a className="wordmark" href="/">datetime<span>.</span>store</a>
      <div className="status-card">
        <span className="status-mark">✳</span>
        <p className="eyebrow"><span>thank you / {isDemo ? "demo" : "confirmed"}</span></p>
        <h1>Your moment<br /><em>is in motion.</em></h1>
        <p>{isDemo ? "This was a no-charge preview. Add a Stripe test secret to turn this exact flow into a real test checkout." : "Your timestamp is saved. We’ll print the moment and send a confirmation to the email you entered at checkout."}</p>
        <a className="purchase-button status-button" href="/">back to the store <span aria-hidden="true">→</span></a>
      </div>
    </main>
  );
}
