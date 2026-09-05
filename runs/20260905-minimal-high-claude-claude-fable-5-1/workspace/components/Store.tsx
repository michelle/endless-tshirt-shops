"use client";

import { useCallback, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import Shirt from "./Shirt";
import Checkout, { type CompletedOrder } from "./Checkout";
import { CURRENCY, PRICE_CENTS, type ShirtSize, type ShirtStyle } from "@/lib/products";

const appearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#337ab7",
    colorText: "#000000",
    colorDanger: "#eb1c26",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSizeBase: "15px",
    borderRadius: "0px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { borderColor: "#a4d5ff", boxShadow: "none" },
    ".Input:focus": { borderColor: "#337ab7", boxShadow: "0 0 0 1px #337ab7" },
    ".Label": { fontSize: "13px", color: "#555" },
    ".Tab": { borderColor: "#a4d5ff" },
  },
};

export default function Store({ publishableKey }: { publishableKey: string }) {
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [completed, setCompleted] = useState<CompletedOrder | null>(null);

  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

  /** Freeze the clock at the moment the customer commits to buying. */
  const freeze = useCallback(() => {
    const ts = Date.now();
    setFrozenAt(ts);
    return ts;
  }, []);
  const unfreeze = useCallback(() => setFrozenAt(null), []);
  const reset = useCallback(() => {
    setCompleted(null);
    setFrozenAt(null);
  }, []);

  return (
    <main className="container">
      <header className="page-header">
        <h1>datetime.store</h1>
        <h2>
          we sell a t-shirt with the current datetime.
          <svg className="clock" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </h2>
      </header>

      <div className="store">
        <section aria-label="Your shirt">
          <Shirt style={style} frozenAt={completed ? completed.timestamp : frozenAt} />
        </section>
        <section aria-label="Checkout">
          {stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{ mode: "payment", amount: PRICE_CENTS, currency: CURRENCY, appearance, loader: "auto" }}
            >
              <Checkout
                style={style}
                size={size}
                onStyleChange={setStyle}
                onSizeChange={setSize}
                onFreeze={freeze}
                onUnfreeze={unfreeze}
                completed={completed}
                onCompleted={setCompleted}
                onReset={reset}
              />
            </Elements>
          ) : (
            <div className="alert alert-warning">Checkout is not configured: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing.</div>
          )}
        </section>
      </div>

      <footer>
        A tribute to the original <a href="https://github.com/michelle/datetime.store">datetime.store</a>. Printed on demand by Prodigi, payments by Stripe.
      </footer>
    </main>
  );
}
