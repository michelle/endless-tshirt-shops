"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

const FITS = [
  { value: "fitted", label: "Fitted", detail: "Women’s softstyle" },
  { value: "unisex", label: "Unisex", detail: "Classic softstyle" },
] as const;

const SIZES = ["S", "M", "L", "XL"] as const;

export default function Home() {
  const [stamp, setStamp] = useState("—");
  const [fit, setFit] = useState<(typeof FITS)[number]["value"]>("fitted");
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [processing, setProcessing] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const tick = () => setStamp(String(Date.now()));
    tick();
    const timer = window.setInterval(() => {
      if (!frozen) tick();
    }, 37);
    return () => window.clearInterval(timer);
  }, [frozen]);

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = String(Date.now());
    setStamp(timestamp);
    setFrozen(true);
    setProcessing(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fit, size, timestamp }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Checkout could not be started.");
      }
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout could not be started.",
      );
      setFrozen(false);
      setProcessing(false);
    }
  }

  return (
    <main className="site-shell">
      <header className="masthead">
        <Link className="brand" href="/" aria-label="datetime.store home">
          datetime.store
        </Link>
        <p>
          we sell a t-shirt with the current datetime.{" "}
          <span aria-hidden="true">◷</span>
        </p>
      </header>

      <section className="product-grid" aria-label="Datetime t-shirt builder">
        <div className="preview-column">
          <div
            className="shirt-stage"
            aria-label={`Black ${fit} shirt preview printed with ${stamp}`}
          >
            <div className={`shirt shirt-${fit}`}>
              <span className="shirt-stamp" aria-hidden="true">
                {stamp}
              </span>
            </div>
            <div className="price-tag">
              <s>$30.00</s> $22.50
            </div>
          </div>
          <p className="caption">
            Your exact checkout timestamp, printed once. Preview updates in
            milliseconds.
          </p>
        </div>

        <form className="purchase-panel" onSubmit={handleCheckout}>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h1>A moment you can wear.</h1>
          <p className="intro">
            Choose your cut and size. We freeze the number when you tap buy,
            then print it in white on soft black cotton.
          </p>

          <fieldset disabled={processing}>
            <legend>Fit</legend>
            <div className="choice-grid two">
              {FITS.map((option) => (
                <label
                  className={`choice ${fit === option.value ? "active" : ""}`}
                  key={option.value}
                >
                  <input
                    type="radio"
                    name="fit"
                    value={option.value}
                    checked={fit === option.value}
                    onChange={() => setFit(option.value)}
                  />
                  <span>{option.label}</span>
                  <small>{option.detail}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={processing}>
            <legend>Size</legend>
            <div className="choice-grid four">
              {SIZES.map((option) => (
                <label
                  className={`choice ${size === option ? "active" : ""}`}
                  key={option}
                >
                  <input
                    type="radio"
                    name="size"
                    value={option}
                    checked={size === option}
                    onChange={() => setSize(option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button className="buy-button" type="submit" disabled={processing}>
            <span>{processing ? "Opening secure checkout…" : "Buy this moment"}</span>
            <span>{processing ? "◌" : "$22.50"}</span>
          </button>
          <div className="reassurance" aria-label="Order benefits">
            <span>Free shipping</span>
            <span>Stripe checkout</span>
            <span>Made to order</span>
          </div>
          <p className="fine-print">
            Printed and fulfilled on demand by Prodigi. You’ll review your
            shipping details before payment.
          </p>
        </form>
      </section>
    </main>
  );
}
