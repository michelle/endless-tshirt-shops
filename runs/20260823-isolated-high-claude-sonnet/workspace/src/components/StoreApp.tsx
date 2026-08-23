"use client";

import { useEffect, useRef, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { getStripeClient } from "@/lib/stripe-client";
import { ShirtVisual } from "@/components/ShirtVisual";
import { CheckoutForm } from "@/components/CheckoutForm";
import {
  formatUsd,
  ORIGINAL_PRICE_CENTS,
  PRICE_CENTS,
  SIZES,
  STYLES,
  type ShirtSize,
  type ShirtStyle,
} from "@/lib/products";

const APPEARANCE: StripeElementsOptions["appearance"] = {
  theme: "stripe",
  variables: {
    colorPrimary: "#161616",
    borderRadius: "10px",
    fontFamily: "inherit",
  },
};

export function StoreApp() {
  const [style, setStyle] = useState<ShirtStyle>("unisex");
  const [size, setSize] = useState<ShirtSize>("M");
  const [frozen, setFrozen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [intent, setIntent] = useState<{ clientSecret: string; paymentIntentId: string } | null>(
    null
  );
  const [loadError, setLoadError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestedIntentRef = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode's double-invoke in dev: a second
    // PaymentIntent would overwrite `intent` state while the already-mounted
    // Elements instance stays bound to the first one's clientSecret (Stripe
    // Elements ignores clientSecret changes after initialization), leaving
    // paymentIntentId pointing at an intent that never gets confirmed.
    if (requestedIntentRef.current) return;
    requestedIntentRef.current = true;

    fetch("/api/create-payment-intent", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => setIntent(data))
      .catch(() => setLoadError(true));
  }, []);

  if (orderId) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        <div className="text-4xl">🕰️👕</div>
        <h2 className="text-xl font-semibold text-neutral-900">
          Congrats on your pretty cool shirt!
        </h2>
        <p className="text-sm text-neutral-500">
          We froze that exact moment and sent it to print. A confirmation email is on its way.
        </p>
        <p className="rounded-md bg-neutral-100 px-3 py-1.5 font-mono text-xs text-neutral-600">
          order #{orderId}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Get another shirt
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 p-8">
        <ShirtVisual shirtStyle={style} canvasRef={canvasRef} frozen={frozen} />

        <div className="mt-8 space-y-5">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Style
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  disabled={frozen}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    style === s.value
                      ? "border-white bg-white/10 text-white"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  <div className="font-semibold">{s.label}</div>
                  <div className="text-xs opacity-70">{s.blurb}</div>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Size
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  disabled={frozen}
                  className={`rounded-lg border py-2 text-sm font-semibold transition ${
                    size === s
                      ? "border-white bg-white/10 text-white"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-sm text-neutral-500 line-through">
              {formatUsd(ORIGINAL_PRICE_CENTS)}
            </span>
            <span className="text-2xl font-bold text-white">{formatUsd(PRICE_CENTS)}</span>
            <span className="text-xs text-neutral-500">free shipping</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">Checkout</h2>
        <p className="mb-6 text-sm text-neutral-500">
          One shirt, printed the instant you pay. No two are ever the same.
        </p>

        {loadError && (
          <p className="text-sm text-red-600">
            Could not start checkout. Refresh the page to try again.
          </p>
        )}
        {!loadError && !intent && (
          <div className="animate-pulse space-y-4">
            <div className="h-10 rounded-lg bg-neutral-100" />
            <div className="h-24 rounded-lg bg-neutral-100" />
            <div className="h-32 rounded-lg bg-neutral-100" />
          </div>
        )}
        {intent && (
          <Elements
            stripe={getStripeClient()}
            options={{ clientSecret: intent.clientSecret, appearance: APPEARANCE }}
          >
            <CheckoutForm
              paymentIntentId={intent.paymentIntentId}
              style={style}
              size={size}
              canvasRef={canvasRef}
              onFreeze={setFrozen}
              onOrderPlaced={setOrderId}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
