"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripeClient";
import ShirtPreview from "./ShirtPreview";
import { PRICE_CENTS, formatUsd, type ShirtSize, type ShirtStyle } from "@/lib/product";

type ShippingDetails = {
  name: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
};

const EMPTY_SHIPPING: ShippingDetails = {
  name: "",
  email: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
};

export default function CheckoutFlow({
  style,
  size,
  onClose,
}: {
  style: ShirtStyle;
  size: ShirtSize;
  onClose: () => void;
}) {
  const [shipping, setShipping] = useState<ShippingDetails>(EMPTY_SHIPPING);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [frozenAt, setFrozenAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof ShippingDetails) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setShipping((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleShippingSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, ...shipping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setFrozenAt(new Date(data.momentISO));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-8">
      <ShirtPreview style={style} frozenAt={frozenAt} />

      <div className="w-full">
        <button
          onClick={onClose}
          className="mb-4 text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Back to shop
        </button>

        {!clientSecret ? (
          <form onSubmit={handleShippingSubmit} className="flex flex-col gap-3">
            <p className="text-xs tracking-[0.2em] text-zinc-500">SHIPPING</p>
            <Input label="Full name" value={shipping.name} onChange={updateField("name")} required />
            <Input label="Email" type="email" value={shipping.email} onChange={updateField("email")} required />
            <Input label="Address" value={shipping.address1} onChange={updateField("address1")} required />
            <Input
              label="Apt, suite, etc. (optional)"
              value={shipping.address2}
              onChange={updateField("address2")}
            />
            <div className="grid grid-cols-3 gap-3">
              <Input label="City" value={shipping.city} onChange={updateField("city")} required />
              <Input label="State" value={shipping.state} onChange={updateField("state")} required />
              <Input label="ZIP" value={shipping.zip} onChange={updateField("zip")} required />
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-teal-400 px-6 py-4 text-sm font-bold uppercase tracking-wide text-black transition disabled:opacity-50"
            >
              {submitting ? "Freezing this moment…" : "Continue to payment"}
            </button>
          </form>
        ) : (
          <Elements
            stripe={getStripe()}
            options={{ clientSecret, appearance: { theme: "night" } }}
          >
            <PaymentStep paymentIntentId={paymentIntentId!} />
          </Elements>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <input
        {...rest}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-400"
      />
    </label>
  );
}

function PaymentStep({ paymentIntentId }: { paymentIntentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed");
      setSubmitting(false);
      return;
    }

    router.push(`/order?payment_intent=${paymentIntentId}`);
  }

  return (
    <form onSubmit={handlePay} className="flex flex-col gap-4">
      <p className="text-xs tracking-[0.2em] text-zinc-500">PAYMENT</p>
      <PaymentElement />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !stripe}
        className="w-full rounded-xl bg-teal-400 px-6 py-4 text-sm font-bold uppercase tracking-wide text-black transition disabled:opacity-50"
      >
        {submitting ? "Processing…" : `Pay ${formatUsd(PRICE_CENTS)}`}
      </button>
      <p className="text-center text-xs text-zinc-500">Test mode — use 4242 4242 4242 4242.</p>
    </form>
  );
}
