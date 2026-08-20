'use client';

import { STYLE_LABEL, formatUsd } from '@/lib/catalog';
import type { OrderOutcome } from './Store';

export default function Success({
  outcome,
  onReset,
}: {
  outcome: OrderOutcome;
  onReset: () => void;
}) {
  const printed = new Date(outcome.capturedAt);

  return (
    <div className="success">
      <h2>Congrats on your pretty cool shirt.</h2>
      <p>
        We captured <strong>{outcome.capturedAt}</strong> — {printed.toISOString()} — and that
        millisecond is now yours alone. A receipt is on its way to{' '}
        <strong>{outcome.email}</strong>.
      </p>

      {outcome.state === 'deferred' && (
        <div className="alert alert-info">
          Your payment went through and your order is queued with our printer. You&apos;ll get a
          shipping confirmation as soon as it enters production.
        </div>
      )}

      <dl className="receipt">
        <div>
          <dt>Order reference</dt>
          <dd className="mono">{outcome.reference}</dd>
        </div>
        {outcome.orderId && (
          <div>
            <dt>Print order</dt>
            <dd className="mono">{outcome.orderId}</dd>
          </div>
        )}
        <div>
          <dt>Shirt</dt>
          <dd>
            {STYLE_LABEL[outcome.style]} · {outcome.size} · Black
          </dd>
        </div>
        <div>
          <dt>Printed datetime</dt>
          <dd className="mono">{outcome.capturedAt}</dd>
        </div>
        <div>
          <dt>Paid</dt>
          <dd>{formatUsd(outcome.amount)}</dd>
        </div>
      </dl>

      <button className="buy" type="button" onClick={onReset}>
        Get another shirt
      </button>
    </div>
  );
}
