import type { OrderStatusResponse } from "@/lib/orderMeta";

export default function OrderSummary({ status }: { status: OrderStatusResponse }) {
  return (
    <div className="order-summary">
      <div className="order-items">
        {status.items.map((item, i) => (
          <div key={i} className="order-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.previewUrl} alt={item.phrase} />
            <div>
              <strong>&ldquo;{item.phrase}&rdquo;</strong>
              <p className="muted">
                {item.shirt} · {item.size.toUpperCase()} · qty {item.qty}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="order-meta">
        {status.amountTotal != null && (
          <p>
            Total paid: {(status.amountTotal / 100).toFixed(2)} {status.currency?.toUpperCase()}
          </p>
        )}
        {status.email && <p>Confirmation sent to {status.email}</p>}
        {status.shippingName && status.shippingAddress && (
          <p>
            Shipping to: {status.shippingName} — {status.shippingAddress.line1},{" "}
            {status.shippingAddress.city}, {status.shippingAddress.country}
          </p>
        )}
      </div>

      <div className="fulfillment-status">
        {status.fulfillmentError && (
          <p className="error">
            We hit a snag sending this to production automatically. Your payment is safe and our
            team has been notified. ({status.fulfillmentError})
          </p>
        )}
        {!status.fulfillmentError && status.prodigiOrderId && (
          <p className="success">
            Sent to print production — Prodigi order <code>{status.prodigiOrderId}</code>, status{" "}
            <strong>{status.prodigiStatus}</strong>.
          </p>
        )}
        {!status.fulfillmentError && !status.prodigiOrderId && (
          <p className="muted">Finalizing your order with our print partner…</p>
        )}
        {status.shipments.length > 0 && (
          <ul className="shipment-list">
            {status.shipments.map((s, i) => (
              <li key={i}>
                {s.carrier} {s.service}
                {s.trackingUrl ? (
                  <a href={s.trackingUrl} target="_blank" rel="noreferrer">
                    {" "}
                    track package
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
