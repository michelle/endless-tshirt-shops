"use client";
import { Clock3, RotateCcw } from "lucide-react";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="success-page">
      <a className="wordmark" href="/">
        datetime.store
      </a>
      <div className="success-icon">
        <Clock3 size={38} />
      </div>
      <h1>
        Give us <em>a moment.</em>
      </h1>
      <p className="dialog-description">
        Something interrupted this page. Please try again. If you just paid,
        keep your receipt link and check the order status before placing another
        order.
      </p>
      <button className="capture-button" onClick={reset}>
        Try again <RotateCcw size={18} />
      </button>
      <a className="underlined-link" href="/">
        Return to the store
      </a>
    </main>
  );
}
