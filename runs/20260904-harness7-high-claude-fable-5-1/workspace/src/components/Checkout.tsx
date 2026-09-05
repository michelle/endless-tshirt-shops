"use client";

import { useMemo, useState } from "react";
import { loadStripe, type Stripe, type StripeElementsOptions } from "@stripe/stripe-js";
import {
  AddressElement,
  Elements,
  ExpressCheckoutElement,
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { formatMoney } from "@/lib/catalog";

const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripe(publishableKey: string) {
  let p = stripeCache.get(publishableKey);
  if (!p) {
    p = loadStripe(publishableKey);
    stripeCache.set(publishableKey, p);
  }
  return p;
}

export interface CheckoutProps {
  publishableKey: string;
  clientSecret: string;
  amount: number;
  shipCountries: string[];
  onPaid: (paymentIntentId: string, email: string | null) => void;
}

export default function Checkout(props: CheckoutProps) {
  const options = useMemo<StripeElementsOptions>(
    () => ({
      clientSecret: props.clientSecret,
      loader: "auto",
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#337ab7",
          colorText: "#111111",
          colorDanger: "#eb1c26",
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          fontSizeBase: "15px",
          borderRadius: "3px",
          spacingUnit: "4px",
        },
        rules: {
          ".Input": { borderColor: "#d9d9d9", boxShadow: "none" },
          ".Input:focus": { borderColor: "#337ab7", boxShadow: "0 0 0 1px #337ab7" },
          ".Label": { fontSize: "13px", color: "#555" },
        },
      },
    }),
    [props.clientSecret],
  );
  return (
    <Elements stripe={getStripe(props.publishableKey)} options={options}>
      <CheckoutForm {...props} />
    </Elements>
  );
}

type ShippingParam = {
  name: string;
  phone?: string;
  address: { line1: string; line2?: string; city: string; state?: string; postal_code: string; country: string };
};

function CheckoutForm({ amount, shipCountries, onPaid }: CheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [walletsReady, setWalletsReady] = useState(false);

  const returnUrl = () => `${window.location.origin}/`;

  async function confirm(shipping: ShippingParam | undefined, receiptEmail: string | undefined) {
    if (!stripe || !elements) return false;
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: returnUrl(),
        receipt_email: receiptEmail,
        shipping,
      },
    });
    if (confirmError) {
      setError(confirmError.message ?? "Payment didn't go through. Please try again.");
      return false;
    }
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      onPaid(paymentIntent.id, receiptEmail ?? null);
      return true;
    }
    setError("Payment is still pending. Please try again.");
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message ?? "Please check the form.");
        return;
      }
      const addressElement = elements.getElement(AddressElement);
      const addr = addressElement ? await addressElement.getValue() : null;
      if (!addr?.complete) {
        setError("Please complete the shipping address.");
        return;
      }
      if (!email) {
        setError("Please enter an email so we can send your receipt.");
        return;
      }
      const v = addr.value;
      await confirm(
        {
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
        },
        email,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="checkout" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <div className={`checkout-section${walletsReady ? "" : " is-collapsed"}`}>
        <ExpressCheckoutElement
          options={{
            emailRequired: true,
            shippingAddressRequired: true,
            allowedShippingCountries: shipCountries,
            shippingRates: [{ id: "free", amount: 0, displayName: "Free shipping" }],
            buttonType: { applePay: "buy", googlePay: "buy" },
            buttonHeight: 48,
          }}
          onReady={({ availablePaymentMethods }) => setWalletsReady(Boolean(availablePaymentMethods))}
          onShippingAddressChange={(event) => {
            const country = event.address.country?.toUpperCase();
            if (country && !shipCountries.includes(country)) {
              event.reject();
            } else {
              event.resolve({ shippingRates: [{ id: "free", amount: 0, displayName: "Free shipping" }] });
            }
          }}
          onShippingRateChange={(event) => event.resolve()}
          onConfirm={async (event) => {
            if (!stripe || !elements) return;
            setBusy(true);
            setError(null);
            try {
              const { error: submitError } = await elements.submit();
              if (submitError) {
                setError(submitError.message ?? "Please check the form.");
                event.paymentFailed?.({ reason: "fail" });
                return;
              }
              const sa = event.shippingAddress;
              const shipping: ShippingParam | undefined = sa
                ? {
                    name: sa.name,
                    address: {
                      line1: sa.address.line1,
                      line2: sa.address.line2 || undefined,
                      city: sa.address.city,
                      state: sa.address.state || undefined,
                      postal_code: sa.address.postal_code,
                      country: sa.address.country,
                    },
                  }
                : undefined;
              const ok = await confirm(shipping, event.billingDetails?.email || undefined);
              if (!ok) event.paymentFailed?.({ reason: "fail" });
            } finally {
              setBusy(false);
            }
          }}
        />
        <div className="checkout-divider">or pay with card</div>
      </div>

      <div className="checkout-section">
        <h3>Email for your receipt</h3>
        <LinkAuthenticationElement onChange={(e) => setEmail(e.value.email)} />
      </div>

      <div className="checkout-section">
        <h3>Ship to</h3>
        <AddressElement
          options={{
            mode: "shipping",
            allowedCountries: shipCountries,
            fields: { phone: "auto" },
            autocomplete: { mode: "automatic" },
          }}
        />
      </div>

      <div className="checkout-section">
        <h3>Payment</h3>
        <PaymentElement options={{ layout: "tabs", wallets: { applePay: "never", googlePay: "never" } }} />
      </div>

      <button className="btn btn-primary" type="submit" disabled={!stripe || !elements || busy}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Processing…
          </>
        ) : (
          `Pay ${formatMoney(amount)}`
        )}
      </button>
      <div className="checkout-footer">
        <span className="lock">
          <LockIcon /> Secured by Stripe
        </span>
        <span>Free shipping · {shipCountries.join(", ")} only</span>
      </div>
    </form>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
