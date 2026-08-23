import Link from 'next/link';

export default function CancelPage() {
  return (
    <main className="success-page">
      <div className="success-card">
        <div className="success-mark muted" aria-hidden="true">○</div>
        <p className="eyebrow">checkout paused</p>
        <h1>Your moment is still here.</h1>
        <p className="success-copy">No charge was made. Come back whenever you&apos;re ready.</p>
        <Link className="button-link" href="/">Return to the tee</Link>
      </div>
    </main>
  );
}
