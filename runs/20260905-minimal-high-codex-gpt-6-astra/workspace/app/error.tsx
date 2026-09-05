"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="order-page">
      <a className="brand" href="/">
        datetime.store
      </a>
      <h1>One moment.</h1>
      <p className="order-lede">
        We couldn’t load this page. Please try again.
      </p>
      <div className="order-actions">
        <button onClick={reset}>Try again</button>
        <a href="/">Back to the store</a>
      </div>
    </main>
  );
}
