"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import type { ShirtSize, ShirtStyle } from "@/lib/products";

declare global {
  interface Window {
    Stripe?: (key: string) => StripeGlobal;
  }
}

interface StripeGlobal {
  elements: () => StripeElements;
  createPaymentMethod: (opts: {
    type: "card";
    card: StripeCardElement;
    billing_details: { name: string; email: string };
  }) => Promise<{ paymentMethod?: { id: string }; error?: { message: string } }>;
}
interface StripeElements {
  create: (type: "card", opts?: Record<string, unknown>) => StripeCardElement;
}
interface StripeCardElement {
  mount: (el: string | HTMLElement) => void;
  on: (event: string, cb: (payload: { error?: { message: string } }) => void) => void;
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export default function Checkout({
  style,
  size,
}: {
  style: ShirtStyle;
  size: ShirtSize;
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const stripeRef = useRef<StripeGlobal | null>(null);
  const cardElRef = useRef<StripeCardElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    if (!scriptReady || !window.Stripe || cardElRef.current) return;
    const stripe = window.Stripe(PUBLISHABLE_KEY);
    stripeRef.current = stripe;
    const elements = stripe.elements();
    const card = elements.create("card", {
      style: {
        base: {
          fontSize: "16px",
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          "::placeholder": { color: "#bbb" },
        },
      },
    });
    if (mountRef.current) {
      card.mount(mountRef.current);
      setCardReady(true);
    }
    card.on("change", (payload) => {
      setCardError(payload.error ? payload.error.message ?? "Card error" : null);
    });
    cardElRef.current = card;
  }, [scriptReady]);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const stripe = stripeRef.current;
    const card = cardElRef.current;
    if (!stripe || !card) return;

    setSubmitting(true);
    try {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: "card",
        card,
        billing_details: { name: form.name, email: form.email },
      });
      if (error || !paymentMethod) {
        setFormError(error?.message ?? "Card details are invalid");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style,
          size,
          email: form.email,
          paymentMethodId: paymentMethod.id,
          address: {
            name: form.name,
            address1: form.address1,
            address2: form.address2,
            city: form.city,
            state: form.state,
            zip: form.zip,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      setOrderId(data.order);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  if (orderId) {
    return (
      <div className="text-center">
        <p className="text-3xl">🎉</p>
        <p className="mt-3 text-lg font-medium">
          Congrats on your pretty cool shirt!
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          You should receive an email confirmation shortly.
        </p>
        <p className="mt-4 text-xs text-neutral-400">Order reference: {orderId}</p>
        <button
          type="button"
          onClick={() => setOrderId(null)}
          className="mt-6 rounded bg-black px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Get another shirt
        </button>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://js.stripe.com/v3/"
        onLoad={() => setScriptReady(true)}
        strategy="afterInteractive"
      />
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field
          label="Name"
          value={form.name}
          onChange={update("name")}
          placeholder="Jenny Rosen"
          required
        />
        <Field
          label="Email (for receipt)"
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="jenny@example.com"
          required
        />
        <Field
          label="Shipping address"
          value={form.address1}
          onChange={update("address1")}
          placeholder="185 Berry St"
          required
        />
        <Field
          label="Apartment / suite (optional)"
          value={form.address2}
          onChange={update("address2")}
          placeholder="Suite 550"
        />
        <div className="flex gap-3">
          <Field
            label="City"
            value={form.city}
            onChange={update("city")}
            placeholder="San Francisco"
            required
          />
          <div className="w-24 flex-none">
            <Field
              label="State"
              value={form.state}
              onChange={update("state")}
              placeholder="CA"
              required
            />
          </div>
          <div className="w-28 flex-none">
            <Field
              label="ZIP"
              value={form.zip}
              onChange={update("zip")}
              placeholder="94107"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Card details
          </label>
          <div
            ref={mountRef}
            className="rounded border border-neutral-300 px-3 py-3 focus-within:border-accent"
          />
          {cardError && <p className="mt-1 text-xs text-red-600">{cardError}</p>}
        </div>

        {formError && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !cardReady}
          className="h-12 w-full rounded bg-black text-base font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Processing…" : !cardReady ? "Loading…" : "Buy now"}
        </button>
        <p className="text-center text-xs text-neutral-400">
          Secure checkout powered by Stripe · test mode, no real charges
        </p>
      </form>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
