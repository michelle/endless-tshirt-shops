import Link from 'next/link';
export default function NotFound(){return <main className="empty-page"><h1>A little off the trail.</h1><p>We couldn’t find that page.</p><Link href="/" className="button" style={{marginTop:25}}>Back to the club ↗</Link></main>}
