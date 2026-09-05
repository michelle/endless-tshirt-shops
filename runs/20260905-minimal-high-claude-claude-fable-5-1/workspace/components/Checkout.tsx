"use client";

import { useCallback, useState, type FormEvent } from "react";
import {
  AddressElement,
  ExpressCheckoutElement,
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent, StripeExpressCheckoutElementReadyEvent } from "@stripe/stripe-js";
import {
  ALLOWED_COUNTRIES,
  formatPrice,
  PRICE_CENTS,
  SIZES,
  STYLE_DESCRIPTIONS,
  STYLE_LABELS,
  STYLES,
  type ShirtSize,
  type ShirtStyle,
} from "@/lib/products";

export interface CompletedOrder {
  paymentIntentId: string;
  prodigiOrderId: string | null;
  timestamp: number;
  email: string;
  fulfillmentError?: string;
}

interface CheckoutProps {
  style: ShirtStyle;
  size: ShirtSize;
  onStyleChange: (style: ShirtStyle) => void;
  onSizeChange: (size: ShirtSize) => void;
  /** Freeze the clock; returns the timestamp that will be printed. */
  onFreeze: () => number;
  onUnfreeze: () => void;
  completed: CompletedOrder | null;
  onCompleted: (order: CompletedOrder) => void;
  onReset: () => void;
}

interface ShippingDetails {
  name: string;
  phone?: string;
  address: { line1: string; line2?: string; city: string; state?: string; postal_code: string; country: string };
}

async function createPaymentIntent(body: {
  style: ShirtStyle;
  size: ShirtSize;
  timestamp: number;
  email: string;
  shipping: ShippingDetails;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error?.message || "Could not start checkout");
  return payload;
}

async function finalizeOrder(paymentIntentId: string): Promise<{ prodigiOrderId: string | null; error?: string }> {
  const res = await fetch("/api/orders/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentIntentId }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) return { prodigiOrderId: null, error: payload?.error?.message || "Payment succeeded but the print order could not be placed yet." };
  return { prodigiOrderId: payload.prodigiOrderId ?? null };
}

export default function Checkout(props: CheckoutProps) {
  const { style, size, onStyleChange, onSizeChange, onFreeze, onUnfreeze, completed, onCompleted, onReset } = props;
  const stripe = useStripe();
  const elements = useElements();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expressReady, setExpressReady] = useState<boolean | null>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [address, setAddress] = useState<ShippingDetails | null>(null);

  const ready = Boolean(stripe && elements);

  /**
   * Shared payment path: freeze the clock, create the PaymentIntent with the
   * shipping details, confirm with Stripe, then place the Prodigi order.
   */
  const pay = useCallback(
    async (shipping: ShippingDetails, payerEmail: string) => {
      if (!stripe || !elements) return;
      setBusy(true);
      setError(null);
      const timestamp = onFreeze();
      try {
        const { error: submitError } = await elements.submit();
        if (submitError) throw new Error(submitError.message);

        const { clientSecret, paymentIntentId } = await createPaymentIntent({ style, size, timestamp, email: payerEmail, shipping });

        const returnUrl = new URL("/order", window.location.origin);
        returnUrl.searchParams.set("payment_intent", paymentIntentId);
        const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: {
            return_url: returnUrl.toString(),
            receipt_email: payerEmail,
            shipping: { name: shipping.name, phone: shipping.phone, address: shipping.address },
          },
          redirect: "if_required",
        });
        if (confirmError) throw new Error(confirmError.message);
        if (!paymentIntent || paymentIntent.status !== "succeeded") {
          throw new Error(`Payment is ${paymentIntent?.status ?? "incomplete"}. Please try again.`);
        }

        const result = await finalizeOrder(paymentIntentId);
        onCompleted({ paymentIntentId, prodigiOrderId: result.prodigiOrderId, timestamp, email: payerEmail, fulfillmentError: result.error });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        onUnfreeze();
      } finally {
        setBusy(false);
      }
    },
    [stripe, elements, style, size, onFreeze, onUnfreeze, onCompleted],
  );

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!elements || busy) return;
    if (!address) {
      setError("Please complete your shipping address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email for your receipt.");
      return;
    }
    await pay(address, email);
  };

  const handleExpressConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    const addr = event.shippingAddress;
    const payerEmail = event.billingDetails?.email || email;
    if (!addr?.address?.line1 || !addr.address.city || !addr.address.postal_code || !addr.address.country) {
      event.paymentFailed({ reason: "invalid_shipping_address" });
      setError("We need a full shipping address to print your shirt.");
      return;
    }
    if (!payerEmail) {
      event.paymentFailed({ reason: "fail" });
      setError("We need an email address for your receipt.");
      return;
    }
    await pay(
      {
        name: addr.name || event.billingDetails?.name || "",
        phone: event.billingDetails?.phone || undefined,
        address: {
          line1: addr.address.line1,
          line2: addr.address.line2 || undefined,
          city: addr.address.city,
          state: addr.address.state || undefined,
          postal_code: addr.address.postal_code,
          country: addr.address.country,
        },
      },
      payerEmail,
    );
  };

  if (completed) {
    return (
      <div className="Checkout-success" role="status">
        <p className="Checkout-success-title">Congrats on your pretty cool shirt!</p>
        <p>Your shirt says</p>
        <div className="stamp">{completed.timestamp}</div>
        <p>
          which is {new Date(completed.timestamp).toLocaleString()}. Your receipt is on its way to <strong>{completed.email}</strong>.
        </p>
        {completed.fulfillmentError ? (
          <div className="alert alert-warning">
            Payment received, but the print order is still being placed: {completed.fulfillmentError} We will retry automatically; keep your order id below.
          </div>
        ) : null}
        <dl>
          <dt>Order</dt>
          <dd>
            <a href={`/order?payment_intent=${encodeURIComponent(completed.paymentIntentId)}`}>{completed.paymentIntentId}</a>
          </dd>
          {completed.prodigiOrderId ? (
            <>
              <dt>Print order</dt>
              <dd>{completed.prodigiOrderId}</dd>
            </>
          ) : null}
          <dt>Shirt</dt>
          <dd>
            {STYLE_LABELS[style]}, size {size}
          </dd>
        </dl>
        <button type="button" className="btn" onClick={onReset} style={{ marginTop: 28 }}>
          ♥ Get another shirt
        </button>
      </div>
    );
  }

  return (
    <div className="Checkout">
      <fieldset className="options" disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="sr-only" style={{ position: "absolute", left: -9999 }}>
          Style
        </legend>
        {STYLES.map((s) => (
          <div className="option" key={s}>
            <input id={`style-${s}`} type="radio" name="style" value={s} checked={style === s} onChange={() => onStyleChange(s)} />
            <label htmlFor={`style-${s}`}>{STYLE_LABELS[s]}</label>
          </div>
        ))}
      </fieldset>
      <fieldset className="options" disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ position: "absolute", left: -9999 }}>Size</legend>
        {SIZES.map((s) => (
          <div className="option" key={s}>
            <input id={`size-${s}`} type="radio" name="size" value={s} checked={size === s} onChange={() => onSizeChange(s)} />
            <label htmlFor={`size-${s}`}>{s}</label>
          </div>
        ))}
      </fieldset>
      <p className="option-hint">
        {STYLE_DESCRIPTIONS[style]}, black. Ships to {ALLOWED_COUNTRIES.join(", ")} only.
      </p>

      {!ready ? (
        <div aria-busy="true">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
      ) : null}

      <div className="Checkout-express" hidden={expressReady === false}>
        <ExpressCheckoutElement
          options={{
            emailRequired: true,
            shippingAddressRequired: true,
            allowedShippingCountries: [...ALLOWED_COUNTRIES],
            shippingRates: [{ id: "free", amount: 0, displayName: "Free shipping" }],
            buttonType: { applePay: "buy", googlePay: "buy" },
            paymentMethods: { amazonPay: "never", klarna: "never", paypal: "never", applePay: "auto", googlePay: "auto", link: "auto" },
            buttonHeight: 47,
            layout: { maxColumns: 1, overflow: "never" },
          }}
          onReady={(e: StripeExpressCheckoutElementReadyEvent) => {
            const available = e.availablePaymentMethods ? Object.values(e.availablePaymentMethods).some(Boolean) : false;
            console.debug("[express checkout] available:", e.availablePaymentMethods);
            setExpressReady(available);
          }}
          onShippingAddressChange={(e) => e.resolve()}
          onShippingRateChange={(e) => e.resolve()}
          onConfirm={handleExpressConfirm}
          onCancel={() => onUnfreeze()}
        />
        {expressReady ? <div className="Checkout-divider">or enter details manually</div> : null}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="Checkout-section">
          <p className="Checkout-section-title">Shipping</p>
          <AddressElement
            options={{
              mode: "shipping",
              allowedCountries: [...ALLOWED_COUNTRIES],
              fields: { phone: "never" },
              autocomplete: { mode: "automatic" },
            }}
            onChange={(e) => {
              if (!e.complete) {
                setAddress(null);
                return;
              }
              const v = e.value;
              setAddress({
                name: v.name,
                phone: v.phone || undefined,
                address: {
                  line1: v.address.line1,
                  line2: v.address.line2 || undefined,
                  city: v.address.city,
                  state: v.address.state || undefined,
                  postal_code: v.address.postal_code,
                  country: v.address.country,
                },
              });
            }}
          />
        </div>
        <div className="Checkout-section">
          <p className="Checkout-section-title">Email (for receipt)</p>
          <LinkAuthenticationElement onChange={(e) => setEmail(e.value.email)} />
        </div>
        <div className="Checkout-section">
          <p className="Checkout-section-title">Payment</p>
          <PaymentElement options={{ layout: "tabs", wallets: { link: "never" } }} onReady={() => setPaymentReady(true)} />
        </div>

        <div className="Checkout-total">
          <span>
            1 shirt <span className="muted">· free shipping</span>
          </span>
          <strong>{formatPrice(PRICE_CENTS)}</strong>
        </div>

        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : null}

        <button type="submit" className="btn" disabled={busy || !ready || !paymentReady}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" /> Processing…
            </>
          ) : (
            "Buy now"
          )}
        </button>
        <p className="fine-print">
          The clock stops the moment you press Buy now; that millisecond is what we print. Printed on demand and shipped free. All sales final (it is, after all, a
          one-of-a-kind moment).
        </p>
      </form>
    </div>
  );
}
