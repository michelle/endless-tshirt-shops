import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="shell">
      <header className="masthead">
        <h1>datetime.store</h1>
        <p>that moment does not exist.</p>
      </header>
      <p>
        <Link href="/">Back to the store</Link>
      </p>
    </main>
  );
}
