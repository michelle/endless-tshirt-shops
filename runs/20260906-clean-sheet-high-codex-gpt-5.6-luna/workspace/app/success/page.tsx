import Link from 'next/link';

export default function SuccessPage() {
  return <main className="message-page"><div className="message-card"><p className="eyebrow">payment received / order queued</p><h1>Good timing.</h1><p>Your timestamp tee is on its way to the print queue. Stripe will email your receipt, and Prodigi will handle the sandbox fulfillment handoff.</p><p className="session-note">Your checkout is recorded securely.</p><Link href="/" className="message-link">return to the drop ↗</Link></div></main>;
}
