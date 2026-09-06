"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import type {
  StripeExpressCheckoutElementClickEvent,
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementReadyEvent,
} from "@stripe/stripe-js";
import {
  AddressElement,
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  ALLOWED_COUNTRIES,
  CURRENCY,
  PRICE_CENTS,
  SIZES,
  STYLES,
  STYLE_LABELS,
  formatMoney,
  type ShirtSize,
  type ShirtStyle,
} from "@/lib/config";

type Props = {
  publishableKey: string;
  style: ShirtStyle;
  size: ShirtSize;
  onStyleChange: (style: ShirtStyle) => void;
  onSizeChange: (size: ShirtSize) => void;
  /** Called with the exact millisecond the buyer committed to. */
  onFreeze: (timestamp: number) => void;
  /** Called when the purchase fails and the shirt may resume ticking. */
  onThaw: () => void;
};

const APPEARANCE: StripeElementsOptions["appearance"] = {
  theme: "stripe",
  variables: {
    colorPrimary: "#337ab7",
    colorText: "#111111",
    colorDanger: "#eb1c26",
    borderRadius: "5px",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSizeBase: "16px",
  },
};

export function Checkout(props: Props) {
  const stripePromise = useMemo(() => loadStripe(props.publishableKey), [props.publishableKey]);
  const options = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: PRICE_CENTS,
      currency: CURRENCY,
      appearance: APPEARANCE,
      loader: "auto",
    }),
    [],
  );
  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm {...props} />
    </Elements>
  );
}

type Shipping = {
  name: string;
  address: {
    line1: string;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code: string;
    country: string;
  };
};

function CheckoutForm({ style, size, onStyleChange, onSizeChange, onFreeze, onThaw }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [expressAvailable, setExpressAvailable] = useState(false);

  const locked = busy;

  const placeOrder = useCallback(
    async (input: { shipping: Shipping; email: string; timestamp: number }) => {
      if (!stripe || !elements) throw new Error("Stripe is still waking up. Try again in a moment.");

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, ...input }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        clientSecret?: string;
        timestamp?: number;
        clockCorrected?: boolean;
        error?: string;
      };
      if (!res.ok || !data.clientSecret || !data.id) {
        throw new Error(data.error || "We could not start your order. Time, however, continued.");
      }
      if (data.clockCorrected && data.timestamp) {
        // Their clock was wrong. Show them the number they actually bought.
        onFreeze(data.timestamp);
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/order/${data.id}`,
          receipt_email: input.email,
        },
        redirect: "if_required",
      });
      if (confirmError) {
        throw new Error(confirmError.message || "Your payment did not go through.");
      }

      router.push(
        `/order/${data.id}?payment_intent=${encodeURIComponent(data.id)}&payment_intent_client_secret=${encodeURIComponent(data.clientSecret)}`,
      );
    },
    [stripe, elements, style, size, onFreeze, router],
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setError(null);

    // This is the moment. This is the number.
    const timestamp = Date.now();
    onFreeze(timestamp);
    setBusy(true);
    try {
      const trimmedEmail = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new Error("We need an email for the receipt. Any email. Yours, ideally.");
      }
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message || "Please check your payment details.");

      const addressElement = elements.getElement("address");
      const addr = addressElement ? await addressElement.getValue() : null;
      if (!addr?.complete) {
        throw new Error("We need somewhere to send it. Please finish the shipping address.");
      }
      await placeOrder({
        shipping: addr.value as Shipping,
        email: trimmedEmail,
        timestamp,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong, and not in the fun way.");
      onThaw();
      setBusy(false);
    }
  };

  const handleExpressClick = (event: StripeExpressCheckoutElementClickEvent) => {
    event.resolve({
      emailRequired: true,
      shippingAddressRequired: true,
      allowedShippingCountries: [...ALLOWED_COUNTRIES],
      shippingRates: [{ id: "free", amount: 0, displayName: "📦 Free shipping!" }],
      business: { name: "datetime.store" },
    });
  };

  const handleExpressConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements || busy) return;
    setError(null);
    const timestamp = Date.now();
    onFreeze(timestamp);
    setBusy(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        event.paymentFailed({ reason: "fail" });
        throw new Error(submitError.message || "Please check your payment details.");
      }
      const shipping = event.shippingAddress;
      const payerEmail = event.billingDetails?.email || email.trim();
      if (!shipping?.address?.line1 || !payerEmail) {
        event.paymentFailed({ reason: "invalid_shipping_address" });
        throw new Error("We need a shipping address and an email to send a shirt into the future.");
      }
      await placeOrder({
        shipping: {
          name: shipping.name,
          address: {
            line1: shipping.address.line1,
            line2: shipping.address.line2,
            city: shipping.address.city,
            state: shipping.address.state,
            postal_code: shipping.address.postal_code,
            country: shipping.address.country,
          },
        },
        email: payerEmail,
        timestamp,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong, and not in the fun way.");
      onThaw();
      setBusy(false);
    }
  };

  const handleExpressReady = (event: StripeExpressCheckoutElementReadyEvent) => {
    setExpressAvailable(Boolean(event.availablePaymentMethods));
  };

  return (
    <form className="checkout" onSubmit={handleSubmit} noValidate>
      <h3>Style</h3>
      <div className="choices" role="radiogroup" aria-label="Style">
        {STYLES.map((s) => (
          <div className="choice" key={s}>
            <input
              type="radio"
              id={`style-${s}`}
              name="style"
              value={s}
              checked={style === s}
              disabled={locked}
              onChange={() => onStyleChange(s)}
            />
            <label htmlFor={`style-${s}`}>{STYLE_LABELS[s]}</label>
          </div>
        ))}
      </div>

      <h3>Size</h3>
      <div className="choices" role="radiogroup" aria-label="Size">
        {SIZES.map((s) => (
          <div className="choice" key={s}>
            <input
              type="radio"
              id={`size-${s}`}
              name="size"
              value={s}
              checked={size === s}
              disabled={locked}
              onChange={() => onSizeChange(s)}
            />
            <label htmlFor={`size-${s}`}>{s}</label>
          </div>
        ))}
      </div>

      <div className="express" style={{ display: expressAvailable ? "block" : "none" }}>
        <h3>Express checkout</h3>
        <ExpressCheckoutElement
          onClick={handleExpressClick}
          onConfirm={handleExpressConfirm}
          onReady={handleExpressReady}
          onCancel={() => {
            onThaw();
            setBusy(false);
          }}
          options={{ buttonType: { applePay: "buy", googlePay: "buy" }, buttonHeight: 48 }}
        />
        <div className="divider">or enter details manually</div>
      </div>

      <h3>Where to send it</h3>
      <label className="field">
        <span>Email (for the receipt)</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          disabled={locked}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <AddressElement
        options={{
          mode: "shipping",
          allowedCountries: [...ALLOWED_COUNTRIES],
          fields: { phone: "never" },
        }}
      />

      <h3>Payment</h3>
      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => setPaymentReady(true)}
      />
      {!paymentReady ? <div className="checkout-loading">Loading the part where you pay…</div> : null}

      {error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : null}

      <button className="buy" type="submit" disabled={!stripe || !elements || !paymentReady || locked}>
        {locked ? (
          <>
            <span className="spin" aria-hidden="true">
              ⟳
            </span>
            Freezing time…
          </>
        ) : (
          <>Buy now · {formatMoney(PRICE_CENTS)}</>
        )}
      </button>
      <p className="fine-print">
        Free shipping. The shirt will show the exact millisecond you click Buy, give or take whatever
        your network was doing. Limited edition of one; the next edition is available immediately after.
      </p>
    </form>
  );
}
