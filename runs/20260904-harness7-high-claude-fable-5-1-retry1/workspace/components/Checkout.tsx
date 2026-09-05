"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Appearance, type StripeElementsOptions, type StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import {
  AddressElement,
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { STYLES, type StyleId } from "@/lib/products";
import type { OrderView } from "@/lib/fulfill";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const appearance: Appearance = {
  theme: "stripe",
  variables: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSizeBase: "16px",
    colorPrimary: "#337ab7",
    colorText: "#000000",
    colorDanger: "#eb1c26",
    colorTextPlaceholder: "#cccccc",
    borderRadius: "0px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "none", borderBottom: "1px solid #a4d5ff", boxShadow: "none", padding: "8px 0", backgroundColor: "transparent" },
    ".Input:focus": { borderBottom: "1px solid #337ab7", boxShadow: "none", outline: "none" },
    ".Input--invalid": { borderBottom: "1px solid #eb1c26", boxShadow: "none" },
    ".Label": { color: "#337ab7", fontSize: "13px", fontWeight: "400", marginBottom: "0px" },
    ".Tab": { border: "1px solid #a4d5ff", boxShadow: "none" },
    ".Tab--selected": { backgroundColor: "#000", color: "#fff", borderColor: "#000" },
    ".Tab--selected:hover": { color: "#fff" },
    ".TabIcon--selected": { fill: "#fff" },
    ".Block": { boxShadow: "none", border: "1px solid #eee" },
  },
};

export interface ShippingInput {
  name: string;
  phone?: string;
  address: { line1: string; line2?: string | null; city: string; state?: string | null; postal_code: string; country: string };
}

export interface CheckoutProps {
  style: StyleId;
  size: string;
  priceCents: number;
  currency: string;
  shipCountries: string[];
  /** Freeze the shirt and return the millisecond being sold. */
  onFreeze: () => number;
  onUnfreeze: () => void;
  onSuccess: (order: OrderView) => void;
  onStyleChange: (style: StyleId) => void;
  onSizeChange: (size: string) => void;
}

export default function Checkout(props: CheckoutProps) {
  const options = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: props.priceCents,
      currency: props.currency,
      appearance,
      loader: "auto",
    }),
    [props.priceCents, props.currency],
  );

  if (!stripePromise) {
    return (
      <div className="Checkout">
        <Pickers {...props} disabled={false} />
        <ul className="errors">
          <li>Checkout is not configured: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing.</li>
        </ul>
      </div>
    );
  }
  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutInner {...props} />
    </Elements>
  );
}

function Pickers({
  style,
  size,
  disabled,
  onStyleChange,
  onSizeChange,
}: Pick<CheckoutProps, "style" | "size" | "onStyleChange" | "onSizeChange"> & { disabled: boolean }) {
  return (
    <div className="pickers">
      <div className="picker-label">Cut</div>
      <div className="picker styles" role="radiogroup" aria-label="Shirt cut">
        {(Object.keys(STYLES) as StyleId[]).map((id) => (
          <div className="radio" key={id}>
            <input
              id={`style-${id}`}
              type="radio"
              name="style"
              value={id}
              checked={style === id}
              disabled={disabled}
              onChange={() => onStyleChange(id)}
            />
            <label htmlFor={`style-${id}`}>{STYLES[id].label}</label>
          </div>
        ))}
      </div>
      <div className="picker-label">Size</div>
      <div className="picker sizes" role="radiogroup" aria-label="Shirt size">
        {STYLES[style].sizes.map((s) => (
          <div className="radio" key={s}>
            <input
              id={`size-${s}`}
              type="radio"
              name="size"
              value={s}
              checked={size === s}
              disabled={disabled}
              onChange={() => onSizeChange(s)}
            />
            <label htmlFor={`size-${s}`}>{s}</label>
          </div>
        ))}
      </div>
      <p className="fineprint">{STYLES[style].description}. Black, printed on demand.</p>
    </div>
  );
}

type Phase = "idle" | "submitting";

function CheckoutInner(props: CheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [expressAvailable, setExpressAvailable] = useState<boolean | null>(null);
  const [manual, setManual] = useState(false);
  const busy = phase === "submitting";
  const latest = useRef(props);
  latest.current = props;

  // If the express checkout element never reports readiness, fall back to the manual form.
  useEffect(() => {
    const t = setTimeout(() => setExpressAvailable((v) => (v === null ? false : v)), 4000);
    return () => clearTimeout(t);
  }, []);

  /**
   * The purchase, shared by both paths:
   * freeze the clock → validate elements → create the PaymentIntent (server sets price)
   * → confirm → ask the server to place the Prodigi order.
   */
  const purchase = useCallback(
    async (input: { email: string; shipping: ShippingInput; express: boolean; billingName?: string }) => {
      if (!stripe || !elements) return { ok: false as const, message: "Payment form is still loading" };
      const p = latest.current;
      setError(null);
      setPhase("submitting");
      const timestamp = p.onFreeze();
      const fail = (message: string) => {
        p.onUnfreeze();
        setPhase("idle");
        setError(message);
        return { ok: false as const, message };
      };
      try {
        const { error: submitError } = await elements.submit();
        if (submitError) return fail(submitError.message ?? "Please check the payment details");

        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ style: p.style, size: p.size, timestamp, email: input.email, shipping: input.shipping }),
        });
        const created = (await res.json()) as { id?: string; clientSecret?: string; error?: string };
        if (!res.ok || !created.clientSecret || !created.id) return fail(created.error ?? "Could not start the payment");

        const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
          elements,
          clientSecret: created.clientSecret,
          redirect: "if_required",
          confirmParams: {
            return_url: `${window.location.origin}/orders/${created.id}`,
            receipt_email: input.email,
            // Manual path: the Address Element (shipping mode) attaches shipping itself and the
            // Payment Element is told not to collect name/email, so we pass those here.
            // Express path: no Address Element is mounted, so pass the wallet's shipping address.
            ...(input.express
              ? {
                  shipping: {
                    name: input.shipping.name,
                    phone: input.shipping.phone,
                    address: {
                      line1: input.shipping.address.line1,
                      line2: input.shipping.address.line2 ?? undefined,
                      city: input.shipping.address.city,
                      state: input.shipping.address.state ?? undefined,
                      postal_code: input.shipping.address.postal_code,
                      country: input.shipping.address.country,
                    },
                  },
                }
              : { payment_method_data: { billing_details: { name: input.billingName || input.shipping.name, email: input.email } } }),
          },
        });
        if (confirmError) return fail(confirmError.message ?? "Payment failed");
        if (!paymentIntent || !["succeeded", "processing", "requires_capture"].includes(paymentIntent.status)) {
          return fail(`Payment is ${paymentIntent?.status ?? "incomplete"}; you have not been charged.`);
        }

        const fulfil = await fetch(`/api/orders/${created.id}`, { method: "POST" });
        const order = (await fulfil.json()) as OrderView;
        setPhase("idle");
        p.onSuccess(order);
        return { ok: true as const };
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [stripe, elements],
  );

  const onExpressConfirm = useCallback(
    async (event: StripeExpressCheckoutElementConfirmEvent) => {
      const addr = event.shippingAddress;
      const emailFromWallet = event.billingDetails?.email ?? "";
      if (!addr?.address) {
        event.paymentFailed({ reason: "invalid_shipping_address" });
        setError("A shipping address is required");
        return;
      }
      const result = await purchase({
        email: emailFromWallet,
        express: true,
        shipping: {
          name: addr.name,
          phone: event.billingDetails?.phone ?? undefined,
          address: {
            line1: addr.address.line1,
            line2: addr.address.line2,
            city: addr.address.city,
            state: addr.address.state,
            postal_code: addr.address.postal_code,
            country: addr.address.country,
          },
        },
      });
      if (!result.ok) event.paymentFailed({ reason: "fail" });
    },
    [purchase],
  );

  const onManualSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!elements) return;
      const trimmed = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setEmailInvalid(true);
        setError("Please enter a valid email for your receipt");
        return;
      }
      const addressEl = elements.getElement("address");
      const { complete, value } = addressEl ? await addressEl.getValue() : { complete: false, value: null };
      if (!complete || !value) {
        setError("Please complete the shipping address");
        return;
      }
      await purchase({
        email: trimmed,
        express: false,
        billingName: value.name,
        shipping: {
          name: value.name,
          phone: value.phone,
          address: {
            line1: value.address.line1,
            line2: value.address.line2,
            city: value.address.city,
            state: value.address.state,
            postal_code: value.address.postal_code,
            country: value.address.country,
          },
        },
      });
    },
    [elements, email, purchase],
  );

  const showManual = manual || expressAvailable === false;

  return (
    <div className="Checkout" aria-busy={busy}>
      <Pickers {...props} disabled={busy} />

      {/* Express Checkout and the manual form are alternatives (as in the original): elements.submit()
          validates every mounted Element, so the Address/Payment Elements only mount for the manual path. */}
      <div className="Checkout-express" style={{ display: expressAvailable && !showManual ? "block" : "none" }}>
        <ExpressCheckoutElement
          options={{
            buttonType: { applePay: "buy", googlePay: "buy" },
            buttonHeight: 47,
            layout: { maxColumns: 1, overflow: "never" },
            emailRequired: true,
            shippingAddressRequired: true,
            allowedShippingCountries: props.shipCountries,
            shippingRates: [
              {
                id: "free",
                amount: 0,
                displayName: "Free shipping",
                deliveryEstimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 12 } },
              },
            ],
            business: { name: "datetime.store" },
          }}
          onReady={(e) => setExpressAvailable(Boolean(e.availablePaymentMethods))}
          onLoadError={() => setExpressAvailable(false)}
          onConfirm={onExpressConfirm}
          onCancel={() => {
            latest.current.onUnfreeze();
            setPhase("idle");
          }}
        />
        <button type="button" className="Checkout-express-switch" onClick={() => setManual(true)}>
          Or enter details manually
        </button>
      </div>

      {expressAvailable === null && !manual ? <div className="Checkout-loading">Loading checkout…</div> : null}

      {showManual ? (
      <form className="Checkout-form" onSubmit={onManualSubmit} noValidate>
        {error ? (
          <ul className="errors" role="alert">
            <li>{error}</li>
          </ul>
        ) : null}

        <label className="field-wrap" htmlFor="email">
          <input
            id="email"
            className={`field ${email ? "" : "is-empty"} ${emailInvalid ? "is-invalid" : ""}`}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="jenny.rosen@example.com"
            value={email}
            disabled={busy}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailInvalid(false);
            }}
            required
          />
          <span>
            <span>Email (for receipt)</span>
          </span>
        </label>

        <div className="Checkout-section">Ship to</div>
        <AddressElement
          options={{
            mode: "shipping",
            allowedCountries: props.shipCountries,
            display: { name: "full" },
            fields: { phone: "auto" },
            autocomplete: { mode: "automatic" },
          }}
        />

        <div className="Checkout-section">Payment</div>
        <PaymentElement
          options={{
            layout: "tabs",
            fields: { billingDetails: { name: "never", email: "never" } },
            wallets: { applePay: "never", googlePay: "never" },
          }}
        />

        <button type="submit" className="btn" disabled={busy || !stripe || !elements}>
          {busy ? <SpinnerIcon /> : <CartIcon />}
          {busy ? "Processing…" : "Buy now"}
        </button>
        <p className="fineprint">
          Your shirt is printed with the exact millisecond you click <strong>Buy now</strong>. All sales final: every shirt
          is one of a kind.
        </p>
      </form>
      ) : null}

      {!showManual && error ? (
        <ul className="errors" role="alert">
          <li>{error}</li>
        </ul>
      ) : null}
    </div>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </svg>
  );
}
