"use client";

import { useState } from "react";
import Shirt from "./Shirt";
import { SIZES, STYLES, type ShirtSize, type ShirtStyle } from "@/lib/catalog";

export default function Store() {
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [frozenTs, setFrozenTs] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    // This click is the moment that gets printed on the shirt.
    const ts = Date.now();
    setFrozenTs(ts);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, ts }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.url) {
        throw new Error(payload.error ?? "Could not start checkout");
      }
      window.location.assign(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
      setFrozenTs(null);
    }
  };

  return (
    <div className="shop">
      <div>
        <Shirt shirtStyle={style} frozenTs={frozenTs} />
      </div>
      <div className="buy-panel">
        <div className="radio-group" role="radiogroup" aria-label="Shirt style">
          {(Object.keys(STYLES) as ShirtStyle[]).map((s) => (
            <div className="radio-option" key={s}>
              <input
                id={`style-${s}`}
                type="radio"
                name="style"
                value={s}
                checked={style === s}
                onChange={() => setStyle(s)}
                disabled={busy}
              />
              <label htmlFor={`style-${s}`}>{STYLES[s].label}</label>
            </div>
          ))}
        </div>
        <div className="radio-group" role="radiogroup" aria-label="Shirt size">
          {SIZES.map((s) => (
            <div className="radio-option" key={s}>
              <input
                id={`size-${s}`}
                type="radio"
                name="size"
                value={s}
                checked={size === s}
                onChange={() => setSize(s)}
                disabled={busy}
              />
              <label htmlFor={`size-${s}`}>{s}</label>
            </div>
          ))}
        </div>
        <button className="buy-button" onClick={handleBuy} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner">↻</span> Freezing your moment…
            </>
          ) : (
            "🛒 Buy now"
          )}
        </button>
        <p className="buy-note">
          📦 Free shipping! Secure checkout by Stripe — Apple&nbsp;Pay,
          Google&nbsp;Pay and cards.
        </p>
        <p className="buy-note">
          The millisecond you press the button is the millisecond printed on
          your shirt. Forever.
        </p>
        {error ? <div className="buy-error">{error}</div> : null}
      </div>
    </div>
  );
}
