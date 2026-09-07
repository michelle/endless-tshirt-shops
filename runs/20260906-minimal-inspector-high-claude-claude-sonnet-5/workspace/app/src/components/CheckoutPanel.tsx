"use client";

import { useState } from "react";
import {
  AddressElement,
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
// Note: the Address Element (mode: "shipping") automatically attaches its
// value to the PaymentIntent's `shipping` field when `stripe.confirmPayment`
// runs in the same Elements instance — no separate server round-trip needed.
import { getStripe } from "@/lib/stripe-client";
import type { ShirtSize, ShirtStyle } from "@/lib/products";

interface CheckoutPanelProps {
  clientSecret: string;
  paymentIntentId: string;
  style: ShirtStyle;
  size: ShirtSize;
  onCancel: () => void;
}

export default function CheckoutPanel(props: CheckoutPanelProps) {
  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#34d399",
            colorBackground: "#18181b",
            colorText: "#f4f4f5",
            colorDanger: "#f87171",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            borderRadius: "10px",
          },
        },
      }}
    >
      <CheckoutForm {...props} />
    </Elements>
  );
}

function CheckoutForm({
  paymentIntentId,
  style,
  size,
  onCancel,
}: CheckoutPanelProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Please check the form for errors.");
      setSubmitting(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order/${paymentIntentId}`,
        receipt_email: email,
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    }
    // On success, Stripe redirects to return_url — no further action here.
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6"
    >
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>
          {style === "fitted" ? "Fitted" : "Unisex"} &middot; Size {size} &middot;
          Black
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-zinc-500 underline decoration-dotted underline-offset-4 hover:text-zinc-300"
        >
          Edit shirt
        </button>
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Shipping address
        </label>
        <AddressElement options={{ mode: "shipping", allowedCountries: ["US", "CA", "GB", "AU"] }} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Payment
        </label>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Processing…" : "Pay $22.50 & print my shirt"}
      </button>
      <p className="text-center text-xs text-zinc-600">
        Free shipping. Printed on demand and shipped by Prodigi.
      </p>
    </form>
  );
}
