import Link from 'next/link';
import { Receipt } from '@/components/Receipt';

export const dynamic = 'force-dynamic';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === 'string' ? params.session_id : null;

  return (
    <main className="page">
      <header className="masthead">
        <h1>datetime.store</h1>
        <p>we sell a t-shirt with the current datetime.</p>
      </header>

      {sessionId ? (
        <Receipt sessionId={sessionId} />
      ) : (
        <div className="receipt">
          <h2>No order to show</h2>
          <p style={{ color: 'var(--muted)' }}>
            This page needs a checkout session to look up.
          </p>
          <p style={{ marginTop: 20 }}>
            <Link href="/">Back to the store</Link>
          </p>
        </div>
      )}
    </main>
  );
}
