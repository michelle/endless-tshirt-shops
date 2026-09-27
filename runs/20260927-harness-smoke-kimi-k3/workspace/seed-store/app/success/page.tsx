import OrderStatus from './OrderStatus';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <div className="success-wrap">
        <h1>Something&apos;s missing</h1>
        <p style={{ color: 'var(--ink-dim)' }}>
          No checkout session found. If you just paid, check your email for a
          receipt — or <a href="/create" style={{ color: 'var(--accent)' }}>grow another shirt</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="success-wrap">
      <p className="kicker">Thank you</p>
      <h1>Your word is on its way to cotton.</h1>
      <p style={{ color: 'var(--ink-dim)', lineHeight: 1.6 }}>
        Here&apos;s what&apos;s happening with your order right now:
      </p>
      <OrderStatus sessionId={sessionId} />
      <p>
        <a href="/create" className="btn btn-ghost">
          Grow another one
        </a>
      </p>
    </div>
  );
}
