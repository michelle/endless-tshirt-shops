export default function CancelPage() {
  return (
    <main className="status-page">
      <a className="wordmark" href="/">datetime<span>.</span>store</a>
      <div className="status-card cancel-card">
        <span className="status-mark">↺</span>
        <p className="eyebrow"><span>no worries</span></p>
        <h1>Still<br /><em>right now.</em></h1>
        <p>Nothing was charged. Your moment is still here whenever you’re ready to make it tangible.</p>
        <a className="purchase-button status-button" href="/#make-it-mine">try again <span aria-hidden="true">→</span></a>
      </div>
    </main>
  );
}
