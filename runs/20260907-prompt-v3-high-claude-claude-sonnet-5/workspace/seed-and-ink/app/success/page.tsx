import Link from 'next/link';
import { SuccessClient } from './SuccessClient';

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;

  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <h1 className="font-display text-3xl mb-4">Thank you 🌱</h1>
      {sessionId ? (
        <SuccessClient sessionId={sessionId} />
      ) : (
        <p className="text-red-400">Missing session — did you get here from Stripe Checkout?</p>
      )}
      <Link href="/customize" className="inline-block mt-10 text-seed-400 hover:text-seed-300 text-sm">
        ← Grow another one
      </Link>
    </div>
  );
}
