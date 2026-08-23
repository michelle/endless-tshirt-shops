"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PRICE_CENTS, ShirtSize, ShirtStyle } from "@/lib/constants";

type Address = {
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
};

const EMPTY_ADDRESS: Address = {
  name: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
};

type Props = {
  style: ShirtStyle;
  size: ShirtSize;
  frozen: boolean;
  onFreeze: () => void;
  onUnfreeze: () => void;
  captureArtwork: () => string;
};

type Phase = "details" | "payment" | "success";

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = true,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="field-group">
      <input
        id={id}
        type={type}
        value={value}
        placeholder=" "
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

function PaymentStep({
  onPaid,
  onBack,
}: {
  onPaid: (paymentIntentId: string) => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      onPaid(paymentIntent.id);
    } else {
      setError("Payment did not complete. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-md border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 hover:border-neutral-400 disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-1 rounded-md bg-neutral-900 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Processing…"
            : `Pay $${(PRICE_CENTS / 100).toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

export default function CheckoutPanel({
  style,
  size,
  frozen,
  onFreeze,
  onUnfreeze,
  captureArtwork,
}: Props) {
  const [phase, setPhase] = useState<Phase>("details");
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [email, setEmail] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.has("payment_intent_client_secret") && params.has("payment_intent")
    );
  });

  const stripePromise = useMemo<Promise<Stripe | null>>(
    () =>
      loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
      ),
    [],
  );

  const finalizeOrder = async (paymentIntentId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/finalize-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not finalize order");
      }
      setOrderId(data.orderId);
      setPhase("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      onUnfreeze();
      setPhase("payment");
    } finally {
      setSubmitting(false);
    }
  };

  // Resume after a redirect-based payment method (e.g. a bank wallet) sends
  // the customer back to this page.
  useEffect(() => {
    if (!resuming) return;
    const params = new URLSearchParams(window.location.search);
    const secret = params.get("payment_intent_client_secret");
    const paymentIntentId = params.get("payment_intent");
    if (!secret || !paymentIntentId) return;
    window.history.replaceState(null, "", window.location.pathname);
    stripePromise
      .then((stripe) => stripe?.retrievePaymentIntent(secret))
      .then((result) => {
        if (result?.paymentIntent?.status === "succeeded") {
          onFreeze();
          setPhase("payment");
          return finalizeOrder(paymentIntentId);
        }
      })
      .finally(() => setResuming(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    onFreeze();

    try {
      const artwork = captureArtwork();
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, email, address, artwork }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not start checkout");
      }
      setClientSecret(data.clientSecret);
      setPhase("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      onUnfreeze();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setPhase("details");
    setClientSecret(null);
    setOrderId(null);
    setError(null);
    onUnfreeze();
  };

  if (resuming) {
    return <p className="text-sm text-neutral-500">Checking on your order…</p>;
  }

  if (phase === "success") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-6 text-center">
        <p className="text-lg font-semibold">
          Congrats on your pretty cool shirt! 🎉
        </p>
        <p className="text-sm text-neutral-600">
          Order <span className="font-mono">{orderId}</span> is headed to
          print. A confirmation just landed in your inbox.
        </p>
        <button
          onClick={handleReset}
          className="mt-2 rounded-md bg-neutral-900 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Get another shirt
        </button>
      </div>
    );
  }

  if (phase === "payment" && clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentStep
          onPaid={finalizeOrder}
          onBack={() => {
            setPhase("details");
            onUnfreeze();
          }}
        />
        {submitting && (
          <p className="mt-2 text-sm text-neutral-500">Placing your order…</p>
        )}
      </Elements>
    );
  }

  return (
    <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-1">
      <Field
        id="email"
        label="Email (for your receipt)"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />
      <Field
        id="name"
        label="Full name"
        value={address.name}
        onChange={(v) => setAddress((a) => ({ ...a, name: v }))}
        autoComplete="name"
      />
      <Field
        id="address1"
        label="Shipping address"
        value={address.address1}
        onChange={(v) => setAddress((a) => ({ ...a, address1: v }))}
        autoComplete="address-line1"
      />
      <Field
        id="address2"
        label="Apartment or suite (optional)"
        value={address.address2}
        onChange={(v) => setAddress((a) => ({ ...a, address2: v }))}
        required={false}
        autoComplete="address-line2"
      />
      <div className="grid grid-cols-3 gap-4">
        <Field
          id="city"
          label="City"
          value={address.city}
          onChange={(v) => setAddress((a) => ({ ...a, city: v }))}
          autoComplete="address-level2"
        />
        <Field
          id="state"
          label="State"
          value={address.state}
          onChange={(v) => setAddress((a) => ({ ...a, state: v }))}
          autoComplete="address-level1"
        />
        <Field
          id="zip"
          label="ZIP"
          value={address.zip}
          onChange={(v) => setAddress((a) => ({ ...a, zip: v }))}
          autoComplete="postal-code"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || frozen}
        className="mt-5 rounded-md bg-neutral-900 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Freezing this moment…" : "Freeze this moment →"}
      </button>
      <p className="mt-1 text-center text-xs text-neutral-400">
        Ships within the US only, for now.
      </p>
    </form>
  );
}
