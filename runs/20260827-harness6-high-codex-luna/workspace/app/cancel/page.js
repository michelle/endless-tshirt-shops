import Link from "next/link";

export default function CancelPage() {
  return (
    <main className="status-page">
      <div className="status-card">
        <span className="status-check status-check--muted">↺</span>
        <p className="eyebrow">checkout paused</p>
        <h1>The moment<br /><em>can wait.</em></h1>
        <p>No charge was made. Your live preview is still here whenever you’re ready to make it official.</p>
        <Link className="text-link" href="/#order">return to checkout <span>→</span></Link>
      </div>
    </main>
  );
}
