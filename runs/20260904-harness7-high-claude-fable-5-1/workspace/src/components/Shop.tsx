"use client";

import { useCallback, useEffect, useState } from "react";
import Shirt from "./Shirt";
import Checkout from "./Checkout";
import {
  PRICE_CENTS,
  SIZE_IDS,
  STYLES,
  STYLE_IDS,
  formatMoney,
  type SizeId,
  type StyleId,
} from "@/lib/catalog";

type Phase =
  | { kind: "browse" }
  | { kind: "starting"; ts: number }
  | { kind: "checkout"; ts: number; paymentIntentId: string; clientSecret: string; amount: number }
  | { kind: "finalizing"; ts: number; paymentIntentId: string }
  | {
      kind: "success";
      ts: number;
      paymentIntentId: string;
      email: string | null;
      prodigiOrderId: string | null;
      note: string | null;
    };

interface ShopProps {
  publishableKey: string;
  shipCountries: string[];
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

export default function Shop({ publishableKey, shipCountries }: ShopProps) {
  const [style, setStyle] = useState<StyleId>("fitted");
  const [size, setSize] = useState<SizeId>("M");
  const [phase, setPhase] = useState<Phase>({ kind: "browse" });
  const [notice, setNotice] = useState<string | null>(null);

  const finalize = useCallback(async (paymentIntentId: string, ts: number, email: string | null) => {
    setPhase({ kind: "finalizing", ts, paymentIntentId });
    let prodigiOrderId: string | null = null;
    let note: string | null = null;
    try {
      const { json } = await postJson("/api/orders/finalize", { paymentIntentId });
      if (json.status === "fulfilled" || json.status === "already_fulfilled") {
        prodigiOrderId = json.prodigiOrderId ?? null;
      } else if (json.status === "not_paid") {
        note = "Your payment is still processing. We'll send the shirt to print as soon as it clears.";
      } else {
        note = "Payment received. Our print partner is temporarily unavailable, so we've queued your order and will retry automatically.";
      }
    } catch {
      note = "Payment received. We'll confirm your print order by email shortly.";
    }
    setPhase({ kind: "success", ts, paymentIntentId, email, prodigiOrderId, note });
  }, []);

  // Handle customers returning from a redirect-based payment method.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get("payment_intent");
    const clientSecret = params.get("payment_intent_client_secret");
    const redirectStatus = params.get("redirect_status");
    if (!paymentIntentId || !clientSecret) return;
    window.history.replaceState({}, "", window.location.pathname);
    if (redirectStatus && redirectStatus !== "succeeded" && redirectStatus !== "processing") {
      setNotice("That payment wasn't completed. Pick your moment again whenever you're ready.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/orders/${paymentIntentId}`, {
          headers: { Authorization: `Bearer ${clientSecret}` },
        });
        const order = await res.json();
        if (order?.shirt) {
          setStyle(order.shirt.style);
          setSize(order.shirt.size);
          await finalize(paymentIntentId, order.shirt.timestamp, null);
        }
      } catch {
        setNotice("We couldn't load your order. Check your email for a receipt.");
      }
    })();
  }, [finalize]);

  async function buy() {
    if (phase.kind !== "browse") return;
    if (!publishableKey) {
      setNotice("Checkout isn't configured yet (missing Stripe publishable key).");
      return;
    }
    setNotice(null);
    let ts = Date.now();
    setPhase({ kind: "starting", ts });
    try {
      let { res, json } = await postJson("/api/checkout", { style, size, timestamp: ts });
      if (res.status === 400 && json?.error?.code === "clock_skew" && typeof json.serverTime === "number") {
        ts = json.serverTime;
        setPhase({ kind: "starting", ts });
        ({ res, json } = await postJson("/api/checkout", { style, size, timestamp: ts }));
      }
      if (!res.ok || !json.clientSecret) {
        throw new Error(json?.error?.message ?? "We couldn't start checkout. Please try again.");
      }
      setPhase({
        kind: "checkout",
        ts,
        paymentIntentId: json.paymentIntentId,
        clientSecret: json.clientSecret,
        amount: json.amount,
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPhase({ kind: "browse" });
    }
  }

  function reset() {
    setNotice(null);
    setPhase({ kind: "browse" });
  }

  const frozenAt = phase.kind === "browse" ? null : phase.ts;
  const locked = phase.kind !== "browse";

  return (
    <div className="shop">
      <div>
        <Shirt style={style} frozenAt={frozenAt} />
      </div>
      <div>
        {notice && (
          <div className="alert alert-info" role="status" style={{ marginBottom: 14 }}>
            {notice}
          </div>
        )}

        {(phase.kind === "browse" || phase.kind === "starting") && (
          <>
            <fieldset className="picker">
              <legend>Style</legend>
              <div className="picker-options">
                {STYLE_IDS.map((id) => (
                  <div className="picker-option" key={id}>
                    <input
                      type="radio"
                      id={`style-${id}`}
                      name="style"
                      value={id}
                      checked={style === id}
                      disabled={locked}
                      onChange={() => setStyle(id)}
                    />
                    <label htmlFor={`style-${id}`}>
                      {STYLES[id].label}
                      <small>{STYLES[id].blurb}</small>
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
            <fieldset className="picker">
              <legend>Size</legend>
              <div className="picker-options">
                {SIZE_IDS.map((id) => (
                  <div className="picker-option" key={id}>
                    <input
                      type="radio"
                      id={`size-${id}`}
                      name="size"
                      value={id}
                      checked={size === id}
                      disabled={locked}
                      onChange={() => setSize(id)}
                    />
                    <label htmlFor={`size-${id}`}>{id}</label>
                  </div>
                ))}
              </div>
            </fieldset>
            <button className="btn btn-primary" type="button" onClick={buy} disabled={phase.kind === "starting"}>
              {phase.kind === "starting" ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Freezing this moment…
                </>
              ) : (
                `Buy now · ${formatMoney(PRICE_CENTS)}`
              )}
            </button>
            <p className="buy-hint">
              The instant you click, the time on the shirt freezes. That&apos;s the one we print.
              <br />
              Apple Pay, Google Pay, Link and cards. Ships free to {shipCountries.join(", ")}.
            </p>
          </>
        )}

        {phase.kind === "checkout" && (
          <>
            <div className="checkout-summary">
              <div>
                <span className="ts">{phase.ts}</span>
                <span className="meta">
                  {STYLES[style].label} · size {size} · black · {STYLES[style].garment}
                </span>
              </div>
              <div className="amount">{formatMoney(phase.amount)}</div>
            </div>
            <Checkout
              publishableKey={publishableKey}
              clientSecret={phase.clientSecret}
              amount={phase.amount}
              shipCountries={shipCountries}
              onPaid={(paymentIntentId, email) => finalize(paymentIntentId, phase.ts, email)}
            />
            <p className="buy-hint">
              <button className="btn-link" type="button" onClick={reset}>
                ← Pick a different moment
              </button>
            </p>
          </>
        )}

        {phase.kind === "finalizing" && (
          <div className="success" role="status">
            <p className="success-title">
              <span className="spinner spinner-dark" aria-hidden="true" />
              Sending your shirt to print…
            </p>
            <p>Payment confirmed. Placing the print order now.</p>
          </div>
        )}

        {phase.kind === "success" && (
          <div className="success">
            <p className="success-title">Congrats on your pretty cool shirt!</p>
            <p>
              Yours, forever: <span className="ts">{phase.ts}</span>
            </p>
            <p>
              {phase.email
                ? `A receipt is on its way to ${phase.email}.`
                : "You'll receive an email receipt shortly."}{" "}
              Printing takes 2–4 days, then it ships free.
            </p>
            {phase.note && (
              <div className="alert alert-info" role="status">
                {phase.note}
              </div>
            )}
            <dl className="success-details">
              <dt>Shirt</dt>
              <dd>
                {STYLES[style].label} · size {size} · black
              </dd>
              <dt>Order reference</dt>
              <dd>{phase.prodigiOrderId ?? phase.paymentIntentId}</dd>
              <dt>Your artwork</dt>
              <dd>
                <a href={`/api/artwork/${phase.ts}.png?style=${style}&preview=1`} target="_blank" rel="noreferrer">
                  preview the print file
                </a>
              </dd>
            </dl>
            <button className="btn" type="button" onClick={reset}>
              ♥ Get another shirt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
