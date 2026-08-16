'use client';

import { STYLES } from '@/lib/catalog';
import type { CompletedOrder } from './CheckoutForm';

export default function SuccessPanel({
  order,
  onReset,
}: {
  order: CompletedOrder;
  onReset: () => void;
}) {
  return (
    <div className="success">
      <h2>Congrats on your pretty cool shirt!</h2>

      <div className="reference">{order.reference}</div>

      <p>
        A <strong>{STYLES[order.style].label.toLowerCase()}</strong> shirt in size{' '}
        <strong>{order.size}</strong>, printed with{' '}
        <span className="stamp">{order.timestamp}</span> — a moment that will not happen again.
      </p>
      <p>
        Your receipt is on its way to <strong>{order.email}</strong>. Shirts print and ship within
        about four business days.
      </p>

      {!order.live && (
        <div className="notice" style={{ textAlign: 'left', marginTop: 20 }}>
          <strong>Dry run.</strong> Payment was captured in Stripe test mode and the print job was
          validated end to end, but no garment was sent to production. Set{' '}
          <code>SP_SUBMIT_ORDERS=true</code> to place real orders.
        </div>
      )}

      <button className="submit" type="button" onClick={onReset}>
        Get another shirt
      </button>
    </div>
  );
}
