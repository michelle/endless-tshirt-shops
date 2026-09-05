"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Shirt from "./Shirt";
import Checkout from "./Checkout";
import { STYLES, formatMoney, formatUtc, type StyleId } from "@/lib/products";
import type { OrderView } from "@/lib/fulfill";

export interface ShopProps {
  priceCents: number;
  compareAtCents: number;
  currency: string;
  shipCountries: string[];
  testMode: boolean;
}

export default function Shop({ priceCents, compareAtCents, currency, shipCountries, testMode }: ShopProps) {
  const [style, setStyle] = useState<StyleId>("fitted");
  const [size, setSize] = useState("M");
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [order, setOrder] = useState<OrderView | null>(null);

  const onFreeze = useCallback(() => {
    const ts = Date.now();
    setFrozenAt(ts);
    return ts;
  }, []);
  const onUnfreeze = useCallback(() => setFrozenAt(null), []);
  const onStyleChange = useCallback((s: StyleId) => {
    setStyle(s);
    setSize((cur) => (STYLES[s].sizes.includes(cur) ? cur : "M"));
  }, []);
  const reset = () => {
    setOrder(null);
    setFrozenAt(null);
  };

  return (
    <div className="grid">
      <div>
        <Shirt
          style={order?.style ?? style}
          frozenAt={order?.timestamp ?? frozenAt}
          showPrice={!order}
          price={formatMoney(priceCents, currency)}
          compareAt={compareAtCents > priceCents ? formatMoney(compareAtCents, currency) : undefined}
        />
        <p className="Shirt-caption">
          {order
            ? "This is your shirt. The clock stopped when you bought it."
            : "The number is the current Unix time in milliseconds. It stops the instant you buy, and that's what gets printed."}
          {testMode ? (
            <>
              {" "}
              <span className="badge">Test mode</span>
            </>
          ) : null}
        </p>
      </div>
      <div>
        {order ? (
          <Success order={order} onReset={reset} />
        ) : (
          <Checkout
            style={style}
            size={size}
            priceCents={priceCents}
            currency={currency}
            shipCountries={shipCountries}
            onFreeze={onFreeze}
            onUnfreeze={onUnfreeze}
            onSuccess={setOrder}
            onStyleChange={onStyleChange}
            onSizeChange={setSize}
          />
        )}
      </div>
    </div>
  );
}

function Success({ order, onReset }: { order: OrderView; onReset: () => void }) {
  const fulfilled = Boolean(order.fulfillment.orderId);
  return (
    <div className="Checkout-success" data-testid="success">
      <p className="Checkout-success-title">Congrats on your pretty cool shirt!</p>
      <p>
        It reads <code data-testid="success-timestamp">{order.timestamp}</code>
        {order.timestamp ? <> — that&apos;s {formatUtc(order.timestamp)}, the millisecond you bought it.</> : null}
      </p>
      <p>
        {order.paid
          ? fulfilled
            ? "It's been sent to the printer."
            : order.fulfillment.error
              ? "Payment received. We'll send it to the printer shortly."
              : "Payment received."
          : "Your payment is processing. We'll send the shirt to the printer as soon as it clears."}{" "}
        {order.email ? <>A receipt is on its way to {order.email}.</> : null}
      </p>
      <p>
        <Link href={`/orders/${order.id}`}>Track this order →</Link>
      </p>
      <button type="button" className="btn" onClick={onReset}>
        <HeartIcon /> Get another shirt
      </button>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
