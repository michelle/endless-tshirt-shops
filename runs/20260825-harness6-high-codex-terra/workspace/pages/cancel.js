import Head from 'next/head';
import Link from 'next/link';
export default function Cancel() { return <main className="status-page"><Head><title>Checkout cancelled — datetime.store</title></Head><div className="status-card"><p className="eyebrow">No charge made</p><h1>Your moment is<br />still ticking.</h1><p>Nothing was purchased. You can return whenever you’re ready and choose a new timestamp.</p><Link className="return-link" href="/">← Return to the shop</Link></div></main>; }
