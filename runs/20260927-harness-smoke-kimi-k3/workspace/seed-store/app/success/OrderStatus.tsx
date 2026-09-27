'use client';

import { useEffect, useState } from 'react';

type Status = {
  paid: boolean;
  fulfilled: boolean;
  prodigiOrderId: string | null;
  word: string | null;
  paletteId: string | null;
  garmentColor: string | null;
  size: string | null;
};

export default function OrderStatus({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      try {
        const res = await fetch(
          `/api/order-status?session_id=${encodeURIComponent(sessionId)}`,
        );
        if (res.ok) {
          const data: Status = await res.json();
          if (!cancelled) setStatus(data);
          if (data.fulfilled) return; // stop polling
        }
      } catch {
        // network hiccup — keep polling
      }
      attempts += 1;
      if (attempts >= 20) {
        if (!cancelled) setGaveUp(true);
        return;
      }
      setTimeout(poll, 3000);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const paid = status?.paid ?? false;
  const fulfilled = status?.fulfilled ?? false;

  return (
    <>
      <ul className="status-list">
        <li className={`status-item ${paid ? 'done' : ''}`}>
          <span className="status-dot" />
          Payment confirmed {paid ? '' : '— waiting…'}
        </li>
        <li className={`status-item ${fulfilled ? 'done' : ''}`}>
          <span className="status-dot" />
          {fulfilled
            ? 'Your one-of-one print file was sent to the DTG lab'
            : 'Growing your print file and sending it to the lab…'}
        </li>
        <li className="status-item">
          <span className="status-dot" />
          Printed on demand and shipped to you (you&apos;ll get a confirmation email)
        </li>
      </ul>

      {fulfilled && status?.prodigiOrderId && (
        <p className="order-ref">
          print order reference: {status.prodigiOrderId}
        </p>
      )}
      {gaveUp && !fulfilled && (
        <p className="order-ref">
          Payment received — we&apos;re still processing your order. It will
          reach the lab within a few minutes; no action needed from you.
        </p>
      )}
    </>
  );
}
