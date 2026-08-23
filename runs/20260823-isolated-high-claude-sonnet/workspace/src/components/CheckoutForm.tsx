"use client";

import { useState, type FormEvent, type RefObject } from "react";
import {
  AddressElement,
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { formatUsd, PRICE_CENTS, type ShirtSize, type ShirtStyle } from "@/lib/products";

export function CheckoutForm({
  paymentIntentId,
  style,
  size,
  canvasRef,
  onFreeze,
  onOrderPlaced,
}: {
  paymentIntentId: string;
  style: ShirtStyle;
  size: ShirtSize;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onFreeze: (frozen: boolean) => void;
  onOrderPlaced: (orderId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setError(null);

    const addressElement = elements.getElement(AddressElement);
    const addressResult = await addressElement?.getValue();
    if (!addressResult?.complete || !addressResult.value) {
      setError("Please complete your shipping address.");
      setSubmitting(false);
      return;
    }
    const { name, address } = addressResult.value;

    const canvas = canvasRef.current;
    const artwork = canvas?.toDataURL("image/png");
    if (!artwork) {
      setError("Could not capture your shirt artwork. Please try again.");
      setSubmitting(false);
      return;
    }
    // Freeze the design now: whatever moment is on the shirt when you hit
    // "buy" is the exact moment that gets printed.
    onFreeze(true);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { receipt_email: email || undefined },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      onFreeze(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      setError(`Payment status: ${paymentIntent?.status ?? "unknown"}. Please try again.`);
      setSubmitting(false);
      onFreeze(false);
      return;
    }

    try {
      const res = await fetch("/api/fulfill-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId,
          style,
          size,
          artwork,
          shipping: {
            name,
            address1: address.line1,
            address2: address.line2 ?? undefined,
            city: address.city,
            state: address.state,
            zip: address.postal_code,
            country: address.country,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Your payment succeeded but we couldn't place the print order.");
        setSubmitting(false);
        onFreeze(false);
        return;
      }
      onOrderPlaced(data.orderId);
    } catch (err) {
      console.error(err);
      setError("Network error while placing your order. Please contact support.");
      setSubmitting(false);
      onFreeze(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <LinkAuthenticationElement onChange={(e) => setEmail(e.value.email)} />
      <AddressElement options={{ mode: "shipping" }} />
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="mt-1 w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Freezing this exact moment…" : `Buy now · ${formatUsd(PRICE_CENTS)}`}
      </button>
      <p className="text-center text-xs text-neutral-400">
        Test mode — use card 4242 4242 4242 4242, any future date/CVC.
      </p>
    </form>
  );
}
