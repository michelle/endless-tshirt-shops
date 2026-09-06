import Link from 'next/link';

export default function CancelPage() {
  return <main className="message-page"><div className="message-card"><p className="eyebrow">checkout paused</p><h1>Still here.</h1><p>No charge was made. Your tee is still waiting for the exact moment.</p><Link href="/" className="message-link">back to the drop ↗</Link></div></main>;
}
