"use client";

import { useMemo, useRef, useState } from "react";
import { loadStripe, type Appearance, type StripeElementsOptions } from "@stripe/stripe-js";
import {
  AddressElement,
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { formatMoney, SHIPPING, type ShippingId } from "@/lib/catalog";
import { orderRef } from "@/lib/order";
import { Label } from "./bits";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const appearance: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#16130f",
    colorBackground: "#fbf8f1",
    colorText: "#16130f",
    colorTextSecondary: "#6b6153",
    colorDanger: "#c0341d",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSizeBase: "15px",
    borderRadius: "10px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid #ded3bd",
      boxShadow: "none",
      backgroundColor: "#fdfbf6",
      padding: "11px 12px",
    },
    ".Input:focus": { border: "1px solid #16130f", boxShadow: "0 0 0 3px rgba(22,19,15,0.08)" },
    ".Label": {
      fontFamily: "'Space Mono', ui-monospace, monospace",
      fontSize: "10px",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#6b6153",
    },
    ".Tab": { border: "1px solid #ded3bd", backgroundColor: "#fdfbf6" },
    ".Tab--selected": { border: "1px solid #16130f", backgroundColor: "#f3ede0" },
  },
};

export type CheckoutProps = {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  allowedCountries: string[];
  shipping: ShippingId;
  returnPath: string;
  onBack: () => void;
};

export function Checkout(props: CheckoutProps) {
  const options = useMemo<StripeElementsOptions>(
    () => ({ clientSecret: props.clientSecret, appearance, loader: "auto" }),
    [props.clientSecret],
  );

  if (!stripePromise) {
    return (
      <p className="font-mono text-xs text-flame">
        The card reader is unplugged — NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing.
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options} key={props.amount}>
      <Form {...props} />
    </Elements>
  );
}

function Form({ amount, allowedCountries, shipping, returnPath, onBack, paymentIntentId }: CheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const returnUrl = typeof window === "undefined" ? returnPath : new URL(returnPath, window.location.origin).toString();

  async function shippingFromElements() {
    const address = elements?.getElement("address");
    if (!address) return null;
    const { complete, value } = await address.getValue();
    if (!complete) return null;
    return {
      name: value.name,
      phone: value.phone || undefined,
      address: {
        line1: value.address.line1,
        line2: value.address.line2 || undefined,
        city: value.address.city,
        state: value.address.state || undefined,
        postal_code: value.address.postal_code,
        country: value.address.country,
      },
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || busy) return;

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("We need an email to send the receipt to.");
      emailRef.current?.focus();
      return;
    }

    setBusy(true);
    setError(null);

    const submitResult = await elements.submit();
    if (submitResult.error) {
      setError(submitResult.error.message ?? "Something in the form is not right.");
      setBusy(false);
      return;
    }

    const ship = await shippingFromElements();
    if (!ship) {
      setError("We need a complete shipping address — a shirt has to land somewhere.");
      setBusy(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl, receipt_email: email, shipping: ship },
    });

    // We only get here when the payment failed; success is a redirect.
    setError(confirmError?.message ?? "The payment did not go through.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div style={{ display: hasWallet ? "block" : "none" }}>
        <Label note="one tap">Wallet</Label>
        <ExpressCheckoutElement
          options={{ buttonHeight: 46, layout: { maxColumns: 2, maxRows: 1 } }}
          onReady={({ availablePaymentMethods }) => setHasWallet(Boolean(availablePaymentMethods))}
          onConfirm={async (event) => {
            if (!stripe || !elements) return;
            setBusy(true);
            const addr = event.shippingAddress;
            const { error: walletError } = await stripe.confirmPayment({
              elements,
              confirmParams: {
                return_url: returnUrl,
                receipt_email: event.billingDetails?.email ?? email,
                shipping: addr
                  ? {
                      name: addr.name,
                      address: {
                        line1: addr.address.line1 ?? "",
                        line2: addr.address.line2 ?? undefined,
                        city: addr.address.city ?? "",
                        state: addr.address.state ?? undefined,
                        postal_code: addr.address.postal_code ?? "",
                        country: addr.address.country ?? "",
                      },
                    }
                  : undefined,
              },
            });
            if (walletError) setError(walletError.message ?? "The wallet declined.");
            setBusy(false);
          }}
          onShippingAddressChange={(event) => event.resolve()}
        />
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-paper-edge" />
          <span className="stamp text-[10px] text-ink-faint">or by hand</span>
          <span className="h-px flex-1 bg-paper-edge" />
        </div>
      </div>

      <div>
        <Label note="for the receipt">Email</Label>
        <input
          ref={emailRef}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-[10px] border border-paper-edge bg-[#fdfbf6] px-3 py-[11px] text-[15px] outline-none transition focus:border-ink focus:ring-[3px] focus:ring-ink/8"
        />
      </div>

      <div>
        <Label note="where it lands">Ship to</Label>
        <AddressElement
          options={{
            mode: "shipping",
            allowedCountries,
            fields: { phone: "auto" },
            display: { name: "full" },
          }}
        />
      </div>

      <div>
        <Label note={SHIPPING[shipping].name}>Payment</Label>
        <PaymentElement options={{ layout: { type: "tabs", defaultCollapsed: false } }} />
      </div>

      {error && (
        <p className="rounded-[10px] border border-flame/30 bg-flame/8 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-flame">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !stripe}
        className="group relative w-full overflow-hidden rounded-full bg-ink px-6 py-4 text-paper transition disabled:opacity-60"
      >
        <span className="stamp relative z-10 text-[12px]">
          {busy ? "Holding the moment…" : `Pay ${formatMoney(amount)}`}
        </span>
        <span className="absolute inset-0 -translate-x-full bg-flame transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0 group-disabled:hidden" />
      </button>

      <div className="flex items-center justify-between font-mono text-[11px] text-ink-faint">
        <button type="button" onClick={onBack} className="underline underline-offset-4 hover:text-ink">
          ← let time start again
        </button>
        <span className="tabular-nums">{orderRef(paymentIntentId)}</span>
      </div>
    </form>
  );
}
