"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import Shirt from "./Shirt";
import Readout from "./Readout";
import {
  COLORS,
  COLOR_INFO,
  LIST_PRICE_CENTS,
  PRICE_CENTS,
  SIZES,
  STYLES,
  STYLE_INFO,
  formatPrice,
  type Color,
  type Size,
  type Style,
} from "@/lib/catalog";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

export default function Store() {
  const [style, setStyle] = useState<Style>("unisex");
  const [color, setColor] = useState<Color>("black");
  const [size, setSize] = useState<Size>("M");
  const [frozenTs, setFrozenTs] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore a moment if the buyer picked it and then reloaded.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("dts:frozen");
      if (raw) {
        const saved = JSON.parse(raw) as { ts: number; style: Style; color: Color; size: Size; at: number };
        if (Date.now() - saved.at < 10 * 60_000) {
          setFrozenTs(saved.ts);
          setStyle(saved.style);
          setColor(saved.color);
          setSize(saved.size);
        } else {
          sessionStorage.removeItem("dts:frozen");
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const freeze = () => {
    const ts = Date.now();
    setError(null);
    setFrozenTs(ts);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
    try {
      sessionStorage.setItem("dts:frozen", JSON.stringify({ ts, style, color, size, at: Date.now() }));
    } catch {
      /* ignore */
    }
  };

  const release = () => {
    setFrozenTs(null);
    setError(null);
    try {
      sessionStorage.removeItem("dts:frozen");
    } catch {
      /* ignore */
    }
  };

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ts: frozenTs,
        style,
        color,
        size,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { clientSecret?: string; error?: string };
    if (!res.ok || !data.clientSecret) {
      const msg = data.error || `Checkout couldn't start (${res.status}).`;
      setError(msg);
      throw new Error(msg);
    }
    return data.clientSecret;
  }, [frozenTs, style, color, size]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <>
      <div className={`flash${flash ? " on" : ""}`} aria-hidden="true" />
      <section className="hero">
        <div className="stage">
          <Shirt style={style} color={color} frozenTs={frozenTs} />
          <div className="shirt-tag">
            <span className="tag">
              <s>{formatPrice(LIST_PRICE_CENTS)}</s> {formatPrice(PRICE_CENTS)}
            </span>
          </div>
          <Readout frozenTs={frozenTs} />
        </div>

        <aside className="card" aria-label="Order">
          {frozenTs === null ? (
            <>
              <div className="card-head">
                <h2 className="card-title">
                  The current moment
                  <small>in milliseconds since 1 Jan 1970, printed on a shirt</small>
                </h2>
                <div className="price">
                  <s>{formatPrice(LIST_PRICE_CENTS)}</s>
                  <b>{formatPrice(PRICE_CENTS)}</b>
                  <small>free shipping · one of one</small>
                </div>
              </div>

              <div className="field">
                <div className="field-label">
                  <span>Cut</span>
                  <span>{STYLE_INFO[style].fabric}</span>
                </div>
                <div className="seg cols-2" role="group" aria-label="Cut">
                  {STYLES.map((s) => (
                    <button key={s} type="button" aria-pressed={style === s} onClick={() => setStyle(s)}>
                      <b>{STYLE_INFO[s].label}</b>
                      <small>{STYLE_INFO[s].blurb}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <div className="field-label">
                  <span>Colour</span>
                  <span>{COLOR_INFO[color].ink} ink</span>
                </div>
                <div className="swatches" role="group" aria-label="Colour">
                  {COLORS.map((c) => (
                    <button key={c} type="button" className="swatch" aria-pressed={color === c} onClick={() => setColor(c)}>
                      <i style={{ background: COLOR_INFO[c].hex }} aria-hidden="true" />
                      {COLOR_INFO[c].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <div className="field-label">
                  <span>Size</span>
                  <span>true to size</span>
                </div>
                <div className="seg cols-5" role="group" aria-label="Size">
                  {SIZES.map((s) => (
                    <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)}>
                      <b>{s}</b>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" className="freeze" onClick={freeze} disabled={!stripePromise}>
                <span>Freeze this moment</span>
                <span className="mono">
                  {stripePromise ? "→ then pay" : "checkout offline"}
                </span>
              </button>
              <p className="fine">
                Whatever the shirt says the instant you press the button is what gets printed. No two shirts can ever
                match. Ships free in 5–14 business days.
              </p>
            </>
          ) : (
            <>
              <div className="ticket">
                <div>
                  <div className="ticket-label">Your moment</div>
                  <div className="ticket-ts">{frozenTs}</div>
                  <div className="ticket-human">
                    {STYLE_INFO[style].label} · {COLOR_INFO[color].label} · {size} ·{" "}
                    {new Date(frozenTs).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                    .{String(frozenTs % 1000).padStart(3, "0")}
                  </div>
                </div>
                <button type="button" onClick={release}>
                  Let it go
                </button>
              </div>

              <div className="checkout-shell">
                {stripePromise ? (
                  <EmbeddedCheckoutProvider key={frozenTs} stripe={stripePromise} options={checkoutOptions}>
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                ) : (
                  <div className="checkout-loading">Stripe isn't configured.</div>
                )}
              </div>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <p className="fine">
                Secure payment by Stripe. Printed and shipped by Prodigi. You'll get a receipt and, later, a tracking
                link.
              </p>
            </>
          )}
        </aside>
      </section>
    </>
  );
}
