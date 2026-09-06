"use client";

import { useState } from "react";
import { LIST_PRICE_CENTS, PRICE_CENTS, formatMoney, type ShirtSize, type ShirtStyle } from "@/lib/config";
import { Shirt } from "./Shirt";
import { Checkout } from "./Checkout";
import { LiveTitle } from "./LiveClock";

export function Store({ publishableKey }: { publishableKey: string }) {
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [frozenAt, setFrozenAt] = useState<number | null>(null);

  return (
    <div className="store">
      <LiveTitle />
      <section aria-label="The shirt">
        <Shirt style={style} frozenAt={frozenAt} frozenNote="this one's yours now">
          <div className="price-tag" aria-label={`Price ${formatMoney(PRICE_CENTS)}, was ${formatMoney(LIST_PRICE_CENTS)}`}>
            <s>{formatMoney(LIST_PRICE_CENTS)}</s>
            {formatMoney(PRICE_CENTS)}
            <small>📦 free shipping</small>
          </div>
        </Shirt>
        <p className="shirt-caption">
          Pictured: the shirt as of right now. Not pictured: the one from a millisecond ago. It&rsquo;s
          gone. Stock: 1, but it keeps changing.
        </p>
      </section>
      <section aria-label="Checkout">
        {publishableKey ? (
          <Checkout
            publishableKey={publishableKey}
            style={style}
            size={size}
            onStyleChange={setStyle}
            onSizeChange={setSize}
            onFreeze={setFrozenAt}
            onThaw={() => setFrozenAt(null)}
          />
        ) : (
          <div className="notice error">
            The store is closed: no Stripe publishable key is configured. Time continues regardless.
          </div>
        )}
      </section>
    </div>
  );
}
