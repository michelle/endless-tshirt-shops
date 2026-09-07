"use client";

import { AddressElement, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent, StripeExpressCheckoutElementShippingAddressChangeEvent } from "@stripe/stripe-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { describeTimestamp } from "@/lib/artwork";
import { formatPrice, PRICE_CENTS, SHIPPING_COUNTRIES, SIZES, STYLE_INFO, STYLES, type Size, type Style } from "@/lib/products";

interface Props {
  style: Style;
  size: Size;
  frozenAt: number | null;
  onStyleChange: (style: Style) => void;
  onSizeChange: (size: Size) => void;
  /** Capture the purchase instant; returns it. */
  freeze: () => number;
  unfreeze: () => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "processing"; label: string }
  | { kind: "paid"; paymentIntentId: string; clientSecret: string; attempts: number }
  | { kind: "done"; orderId: string; timestamp: number }
  | { kind: "paid-unfulfilled"; paymentIntentId: string; timestamp: number; message: string };

interface OrderStatus {
  status: "unpaid" | "fulfilled" | "failed";
  orderId?: string;
  timestamp?: number;
  message?: string;
  error?: string;
}

const FREE_SHIPPING = [{ id: "free", displayName: "📦 Free shipping!", amount: 0 }];
const MAX_POLLS = 8;

export function Checkout({ style, size, frozenAt, onStyleChange, onSizeChange, freeze, unfreeze }: Props) {
  const stripe = useStripe();
  const elements = useElements();

  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [expressReady, setExpressReady] = useState<boolean | null>(null); // null = still checking
  const [email, setEmail] = useState("");
  const [paymentReady, setPaymentReady] = useState(false);
  const submittingRef = useRef(false);

  const busy = phase.kind !== "idle";
  const showManual = manual || expressReady === false;

  // Returning from a redirect-based payment method (e.g. a bank redirect).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pi = params.get("payment_intent");
    const secret = params.get("payment_intent_client_secret");
    if (pi && secret) {
      window.history.replaceState({}, "", window.location.pathname);
      if (params.get("redirect_status") === "failed") {
        setError("Your payment was not completed. Please try again.");
      } else {
        setPhase({ kind: "paid", paymentIntentId: pi, clientSecret: secret, attempts: 0 });
      }
    }
  }, []);

  // If the wallet availability check never reports (blocked script, slow
  // network, unsupported browser), fall back to the card form rather than
  // leaving the customer staring at a spinner.
  useEffect(() => {
    if (expressReady !== null) return;
    const t = window.setTimeout(() => setExpressReady((v) => (v === null ? false : v)), 6000);
    return () => window.clearTimeout(t);
  }, [expressReady]);

  // After payment: ask the server for the order (which fulfils it if the webhook hasn't yet).
  useEffect(() => {
    if (phase.kind !== "paid") return;
    let cancelled = false;
    const { paymentIntentId, clientSecret, attempts } = phase;
    const run = async () => {
      let result: OrderStatus | null = null;
      try {
        const res = await fetch(`/api/order?payment_intent=${encodeURIComponent(paymentIntentId)}&client_secret=${encodeURIComponent(clientSecret)}`, {
          cache: "no-store",
        });
        result = (await res.json()) as OrderStatus;
      } catch {
        result = null;
      }
      if (cancelled) return;
      if (result?.status === "fulfilled" && result.orderId) {
        setPhase({ kind: "done", orderId: result.orderId, timestamp: result.timestamp ?? frozenAt ?? 0 });
        return;
      }
      if (attempts + 1 >= MAX_POLLS) {
        setPhase({
          kind: "paid-unfulfilled",
          paymentIntentId,
          timestamp: result?.timestamp ?? frozenAt ?? 0,
          message: result?.message ?? result?.error ?? "We could not confirm the print order yet.",
        });
        return;
      }
      window.setTimeout(() => {
        if (!cancelled) setPhase({ kind: "paid", paymentIntentId, clientSecret, attempts: attempts + 1 });
      }, 1500 * (attempts + 1));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [phase, frozenAt]);

  const fail = useCallback(
    (message: string) => {
      setError(message);
      setPhase({ kind: "idle" });
      unfreeze();
      submittingRef.current = false;
    },
    [unfreeze],
  );

  /**
   * Shared purchase path for both the wallet buttons and the manual form:
   * 1. freeze the timestamp (this *is* the design)
   * 2. create the PaymentIntent server-side with every detail needed to print and ship
   * 3. confirm the payment with the Elements instance
   * 4. poll for the Prodigi order
   */
  const purchase = useCallback(
    async (details: {
      email: string;
      name: string;
      phone?: string;
      address: Record<string, string | null | undefined>;
      /** true when the Address Element is mounted and will attach shipping itself */
      addressElementMounted: boolean;
    }) => {
      if (!stripe || !elements || submittingRef.current) return;
      submittingRef.current = true;
      setError(null);
      setPhase({ kind: "processing", label: "Processing..." });

      const timestamp = freeze();

      const { error: submitError } = await elements.submit();
      if (submitError) return fail(submitError.message ?? "Please check your payment details.");

      let clientSecret: string;
      let paymentIntentId: string;
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            style,
            size,
            timestamp,
            email: details.email,
            shipping: {
              name: details.name,
              phone: details.phone,
              address: {
                line1: details.address.line1,
                line2: details.address.line2,
                city: details.address.city,
                state: details.address.state,
                postal_code: details.address.postal_code,
                country: details.address.country,
              },
            },
          }),
        });
        const payload = (await res.json()) as { clientSecret?: string; paymentIntentId?: string; error?: string };
        if (!res.ok || !payload.clientSecret || !payload.paymentIntentId) {
          return fail(payload.error ?? "Could not start checkout.");
        }
        clientSecret = payload.clientSecret;
        paymentIntentId = payload.paymentIntentId;
      } catch {
        return fail("Network error. Please try again.");
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.origin + window.location.pathname,
          ...(details.addressElementMounted
            ? {}
            : {
                shipping: {
                  name: details.name,
                  phone: details.phone,
                  address: {
                    line1: details.address.line1 ?? "",
                    line2: details.address.line2 ?? undefined,
                    city: details.address.city ?? "",
                    state: details.address.state ?? "",
                    postal_code: details.address.postal_code ?? "",
                    country: details.address.country ?? "",
                  },
                },
              }),
        },
        redirect: "if_required",
      });
      if (confirmError) return fail(confirmError.message ?? "Your payment could not be processed.");

      if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
        setPhase({ kind: "paid", paymentIntentId, clientSecret, attempts: 0 });
        submittingRef.current = false;
        return;
      }
      return fail("Your payment was not completed. Please try again.");
    },
    [stripe, elements, freeze, fail, style, size],
  );

  // --- Express Checkout (Apple Pay / Google Pay / Link) ---
  const onExpressClick = useCallback((event: { resolve: (opts?: Record<string, unknown>) => void }) => {
    event.resolve({
      emailRequired: true,
      shippingAddressRequired: true,
      allowedShippingCountries: [...SHIPPING_COUNTRIES],
      shippingRates: FREE_SHIPPING,
      business: { name: "datetime.store" },
    });
  }, []);

  const onShippingAddressChange = useCallback((event: StripeExpressCheckoutElementShippingAddressChangeEvent) => {
    if ((SHIPPING_COUNTRIES as readonly string[]).includes(event.address.country)) {
      event.resolve({ shippingRates: FREE_SHIPPING });
    } else {
      event.reject();
    }
  }, []);

  const onExpressConfirm = useCallback(
    async (event: StripeExpressCheckoutElementConfirmEvent) => {
      const addr = event.shippingAddress;
      const emailAddr = event.billingDetails?.email ?? "";
      if (!addr) return fail("A shipping address is required.");
      await purchase({
        email: emailAddr,
        name: addr.name,
        phone: event.billingDetails?.phone ?? undefined,
        address: addr.address,
        addressElementMounted: showManual,
      });
    },
    [purchase, fail, showManual],
  );

  // --- Manual form ---
  const onManualSubmit = useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      if (!elements) return;
      const addressElement = elements.getElement(AddressElement);
      const value = addressElement ? await addressElement.getValue() : null;
      if (!value?.complete) {
        setError("Please complete your shipping address.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
      await purchase({
        email: email.trim(),
        name: value.value.name,
        phone: value.value.phone ?? undefined,
        address: value.value.address,
        addressElementMounted: true,
      });
    },
    [elements, email, purchase],
  );

  const reset = useCallback(() => {
    setPhase({ kind: "idle" });
    setError(null);
    unfreeze();
  }, [unfreeze]);

  // ------------------------------------------------------------------ render

  if (phase.kind === "done") {
    return (
      <div className="Checkout-success" role="status">
        <p className="Checkout-success-title">Congrats on your pretty cool shirt!</p>
        <p>
          Your shirt reads <span className="order-ref">{phase.timestamp}</span>
          <br />
          <small>({describeTimestamp(phase.timestamp)})</small>
        </p>
        <p>
          Print order <span className="order-ref">{phase.orderId}</span> is with our printer. You should receive an email shortly with your receipt.
        </p>
        <p>
          <a href={`/api/artwork/${phase.timestamp}.png`} target="_blank" rel="noreferrer">
            See the artwork that goes on your shirt
          </a>
        </p>
        <button type="button" className="btn-buy" onClick={reset}>
          ♥ Get another shirt
        </button>
      </div>
    );
  }

  if (phase.kind === "paid-unfulfilled") {
    return (
      <div className="Checkout-success" role="status">
        <p className="Checkout-success-title">Payment received. Thank you!</p>
        <p>
          Your shirt reads <span className="order-ref">{phase.timestamp}</span>.
        </p>
        <div className="alert info">
          We are still handing your order to the printer. This usually completes within a minute; you will get a receipt by email either way. Keep this
          reference: <span className="order-ref">{phase.paymentIntentId}</span>
        </div>
        <button type="button" className="btn-buy" onClick={reset}>
          ♥ Get another shirt
        </button>
      </div>
    );
  }

  if (phase.kind === "paid") {
    return (
      <div className="Checkout-success" role="status" aria-live="polite">
        <p className="Checkout-success-title">Payment received.</p>
        <p>
          <span className="spinner dark" /> Sending your shirt to the printer...
        </p>
      </div>
    );
  }

  return (
    <div className="Checkout">
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} disabled={busy}>
        <legend className="sr-only" style={{ position: "absolute", left: -9999 }}>
          Style
        </legend>
        <div className="choices styles" role="radiogroup" aria-label="Style">
          {STYLES.map((s) => (
            <div className="choice" key={s}>
              <input id={`style-${s}`} type="radio" name="style" value={s} checked={style === s} onChange={() => onStyleChange(s)} />
              <label htmlFor={`style-${s}`}>{STYLE_INFO[s].label}</label>
            </div>
          ))}
        </div>
        <div className="choices sizes" role="radiogroup" aria-label="Size">
          {SIZES.map((s) => (
            <div className="choice" key={s}>
              <input id={`size-${s}`} type="radio" name="size" value={s} checked={size === s} onChange={() => onSizeChange(s)} />
              <label htmlFor={`size-${s}`}>{s}</label>
            </div>
          ))}
        </div>
      </fieldset>
      <p className="choices-hint">
        {STYLE_INFO[style].label} · {size} · black · {formatPrice(PRICE_CENTS)} with free shipping
      </p>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <div className="Checkout-express" style={{ display: expressReady ? "block" : "none" }}>
        <ExpressCheckoutElement
          options={{
            buttonType: { applePay: "buy", googlePay: "buy" },
            buttonHeight: 48,
            layout: { maxColumns: 1, maxRows: 3 },
          }}
          onReady={({ availablePaymentMethods }) => setExpressReady(Boolean(availablePaymentMethods))}
          onClick={onExpressClick}
          onShippingAddressChange={onShippingAddressChange}
          onConfirm={onExpressConfirm}
          onCancel={() => {
            if (phase.kind === "processing") reset();
          }}
        />
      </div>

      {expressReady === null && !manual && <div className="Checkout-loading">Loading checkout...</div>}

      {expressReady && !manual && (
        <button type="button" className="Checkout-switch" onClick={() => setManual(true)}>
          Or enter details manually
        </button>
      )}

      {showManual && (
        <form onSubmit={onManualSubmit} noValidate>
          {expressReady && <div className="Checkout-divider">or pay with card</div>}
          <div className="Checkout-section">
            <h3>Email (for receipt)</h3>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="field-input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="jenny.rosen@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="Checkout-section">
            <h3>Shipping</h3>
            <AddressElement
              options={{
                mode: "shipping",
                allowedCountries: [...SHIPPING_COUNTRIES],
                fields: { phone: "never" },
                autocomplete: { mode: "automatic" },
              }}
            />
          </div>
          <div className="Checkout-section">
            <h3>Payment</h3>
            <PaymentElement
              options={{ layout: "tabs", wallets: { applePay: "never", googlePay: "never", link: "never" } }}
              onReady={() => setPaymentReady(true)}
            />
          </div>
          <button type="submit" className="btn-buy" disabled={busy || !paymentReady || !stripe}>
            {busy ? (
              <>
                <span className="spinner" /> {phase.kind === "processing" ? phase.label : "Processing..."}
              </>
            ) : (
              <>🛒 Buy now · {formatPrice(PRICE_CENTS)}</>
            )}
          </button>
          <p className="fine-print">The timestamp on your shirt is captured the instant you press Buy.</p>
        </form>
      )}
    </div>
  );
}
