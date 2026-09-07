"use client";

import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useCallback, useMemo, useState } from "react";
import { CURRENCY, PRICE_CENTS, type Size, type Style } from "@/lib/products";
import { Checkout } from "./Checkout";
import { Shirt } from "./Shirt";

interface Props {
  publishableKey: string;
  shirtFontFamily: string;
}

let stripePromise: Promise<StripeJs | null> | null = null;
function getStripe(key: string) {
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

/**
 * Owns the three things that make a shirt: cut, size, and the instant it was
 * bought. The instant is captured ("frozen") the moment the customer commits
 * to buying, and the preview stops ticking so what they see is what they get.
 */
export function Store({ publishableKey, shirtFontFamily }: Props) {
  const [style, setStyle] = useState<Style>("fitted");
  const [size, setSize] = useState<Size>("M");
  const [frozenAt, setFrozenAt] = useState<number | null>(null);

  const freeze = useCallback(() => {
    const ts = Date.now();
    setFrozenAt(ts);
    return ts;
  }, []);
  const unfreeze = useCallback(() => setFrozenAt(null), []);

  const stripe = useMemo(() => (publishableKey ? getStripe(publishableKey) : null), [publishableKey]);

  const elementsOptions = useMemo(
    () => ({
      mode: "payment" as const,
      amount: PRICE_CENTS,
      currency: CURRENCY,
      appearance: {
        theme: "stripe" as const,
        variables: {
          colorPrimary: "#337ab7",
          colorText: "#111111",
          colorDanger: "#eb1c26",
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          borderRadius: "3px",
          spacingUnit: "4px",
        },
      },
    }),
    [],
  );

  const checkoutProps = { style, size, frozenAt, onStyleChange: setStyle, onSizeChange: setSize, freeze, unfreeze };

  return (
    <div className="layout">
      <Shirt style={style} frozenAt={frozenAt} fontFamily={shirtFontFamily} />
      {stripe ? (
        <Elements stripe={stripe} options={elementsOptions}>
          <Checkout {...checkoutProps} />
        </Elements>
      ) : (
        <div className="alert">Checkout is not configured: missing Stripe publishable key.</div>
      )}
    </div>
  );
}
