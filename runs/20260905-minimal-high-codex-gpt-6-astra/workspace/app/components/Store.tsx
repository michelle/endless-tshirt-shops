"use client";
import { useEffect, useState, useRef } from "react";
import SizeGuide from "./SizeGuide";
import {
  ArrowUpRight,
  ArrowRight,
  Clock3,
  LockKeyhole,
  Truck,
} from "lucide-react";
export default function Store() {
  const [now, setNow] = useState<number | null>(null);
  const [fit, setFit] = useState("unisex");
  const [size, setSize] = useState("M");
  const [busy, setBusy] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [error, setError] = useState("");
  const [canceled, setCanceled] = useState(false);
  const pending = useRef<{
    fit: string;
    size: string;
    timestamp: number;
    requestId: string;
  } | null>(null);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.has("canceled")) {
      setCanceled(true);
      if (["unisex", "fitted"].includes(query.get("fit") ?? ""))
        setFit(query.get("fit")!);
      if (["S", "M", "L", "XL"].includes(query.get("size") ?? ""))
        setSize(query.get("size")!);
      history.replaceState({}, "", "/");
    } else {
      try {
        const prefs = JSON.parse(
          localStorage.getItem("datetime-preferences") ?? "{}",
        );
        if (["unisex", "fitted"].includes(prefs.fit)) setFit(prefs.fit);
        if (["S", "M", "L", "XL"].includes(prefs.size)) setSize(prefs.size);
      } catch {}
    }
  }, []);
  useEffect(() => {
    if (frozen) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 47);
    return () => clearInterval(id);
  }, [frozen]);
  function resume() {
    pending.current = null;
    setFrozen(false);
    setError("");
  }
  async function checkout() {
    if (busy || !now) return;
    const input = pending.current ?? {
      fit,
      size,
      timestamp: now,
      requestId: crypto.randomUUID(),
    };
    pending.current = input;
    setNow(input.timestamp);
    setFrozen(true);
    setBusy(true);
    setError("");
    setCanceled(false);
    try {
      localStorage.setItem(
        "datetime-preferences",
        JSON.stringify({ fit, size }),
      );
    } catch {}
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(55000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Checkout could not be started.");
      try {
        sessionStorage.setItem(
          "datetime-last-order",
          JSON.stringify({ sessionId: data.sessionId, token: data.orderToken }),
        );
      } catch {}
      window.location.assign(data.url);
    } catch (e) {
      setError(
        e instanceof Error && e.name === "TimeoutError"
          ? "Checkout took longer than expected. Try again to recover this same moment."
          : e instanceof Error
            ? e.message
            : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }
  const isTest = process.env.NEXT_PUBLIC_APP_MODE !== "live";
  return (
    <>
      <header className="header">
        <a href="/" className="brand">
          datetime<span className="brand-dot">.</span>store
        </a>
        <nav>
          <a href="#how-it-works">
            How it works <ArrowUpRight size={13} />
          </a>
          <a href="#details">
            The details <ArrowUpRight size={13} />
          </a>
        </nav>
        <span className="header-note">
          <span className="live-dot" /> A little piece of right now.
        </span>
      </header>
      <a className="skip-link" href="#product-config">
        Skip to product options
      </a>
      <main>
        <section className="intro">
          <span className="eyebrow">
            AN ONGOING EDITION. ONE MOMENT AT A TIME.
          </span>
          <h1>
            Wear this <span>moment.</span>
          </h1>
          <p>
            We sell a t-shirt with the current datetime. That’s it.
            <br />
            An ordinary tee. An unrepeatable moment.
          </p>
        </section>
        <section className="product" aria-label="The datetime tee">
          <div className="preview">
            <div className="preview-top">
              <span className="eyebrow">NO. 001 — THE DATETIME TEE</span>
              <span className="live-label">
                <span className="live-dot" />{" "}
                {frozen ? "MOMENT CAPTURED" : "LIVE PREVIEW"}
              </span>
            </div>
            <div className={`shirt-scene ${fit}`}>
              <img
                src="/images/shirt.webp"
                width="1100"
                height="1100"
                fetchPriority="high"
                alt="Black cotton crew-neck t-shirt"
              />
              <span className="shirt-stamp" aria-hidden="true">
                {now ?? "1788610000000"}
              </span>
            </div>
            <div className="preview-bottom">
              <span>Black cotton. White ink. Your moment.</span>
              <span>ILLUSTRATIVE PREVIEW</span>
            </div>
          </div>
          <div className="config" id="product-config">
            {canceled && (
              <p className="notice" role="status">
                Checkout canceled. You haven’t been charged. Find a new moment
                below.
              </p>
            )}
            <div className="product-heading">
              <h2>The datetime tee</h2>
              <span className="price">$22.50</span>
            </div>
            <p className="product-sub">A timestamp you can take with you.</p>
            <div className="moment-box">
              <span className="eyebrow">
                <Clock3 size={13} /> YOUR MOMENT, IN MILLISECONDS
              </span>
              <div
                className="counter"
                aria-label={
                  frozen
                    ? `Captured timestamp ${now}`
                    : "Live Unix timestamp in milliseconds"
                }
              >
                {now ?? "1788610000000"}
                <span className="cursor" />
              </div>
              <p>
                {frozen
                  ? "Captured. This exact timestamp will be printed."
                  : "The clock stops when you hit checkout."}
              </p>
            </div>
            <fieldset disabled={busy || frozen}>
              <legend>
                01 <span>Choose your fit</span>
              </legend>
              <div className="fit-options">
                {["unisex", "fitted"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFit(f)}
                    aria-pressed={fit === f}
                    className={fit === f ? "selected" : ""}
                  >
                    <span>{f === "unisex" ? "Unisex" : "Fitted"}</span>
                    <small>
                      {f === "unisex"
                        ? "Easy, everyday shape"
                        : "A closer silhouette"}
                    </small>
                    <span className="radio-dot" />
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="size-row">
              <span className="size-label">
                <span>02</span> Choose your size
              </span>
              <SizeGuide fit={fit} />
            </div>
            <fieldset disabled={busy || frozen} aria-label="Choose your size">
              <div className="size-options">
                {["S", "M", "L", "XL"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                    className={size === s ? "selected" : ""}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
            <button
              className="checkout"
              onClick={checkout}
              disabled={busy || now === null}
            >
              {busy
                ? "Capturing your moment…"
                : error
                  ? "Try checkout again"
                  : "Make this moment yours"}{" "}
              <ArrowRight size={19} />
            </button>
            {error && (
              <div className="checkout-error" role="alert">
                <p>{error}</p>
                <button onClick={resume}>
                  Resume the clock and start again
                </button>
              </div>
            )}
            <div className="checkout-notes">
              <span>
                <Truck size={15} /> Free US shipping
              </span>
              <span>
                <LockKeyhole size={13} /> Secure checkout
              </span>
            </div>
            {isTest && (
              <p className="test-note">
                Test edition · No real charges or shipments.
              </p>
            )}
          </div>
        </section>
        <section className="how" id="how-it-works">
          <div>
            <span className="eyebrow">THE IDEA IS SIMPLE</span>
            <h2>
              Time flies.
              <br />
              Keep a little.
            </h2>
          </div>
          <div className="step">
            <span>01 / CAPTURE</span>
            <h3>Find your right now.</h3>
            <p>
              The numbers are milliseconds since January 1, 1970. A tiny,
              precise address in time.
            </p>
          </div>
          <div className="step">
            <span>02 / MAKE IT YOURS</span>
            <h3>Stop the clock.</h3>
            <p>
              Choose your fit and size. Hit checkout to freeze the timestamp
              that goes on your tee.
            </p>
          </div>
          <div className="step">
            <span>03 / WEAR IT OUT</span>
            <h3>A moment, made tangible.</h3>
            <p>
              Your timestamp is printed in white on a black cotton tee, made
              just for you.
            </p>
          </div>
        </section>
        <section className="details" id="details">
          <span className="eyebrow">LESS, BUT WITH MEANING.</span>
          <h2>
            One tee. Thirteen digits.
            <br />A story only you know.
          </h2>
          <p>
            Soft cotton. A clean silhouette. No big logos, no extra noise.
            <br />
            Just the moment you decided to make it yours.
          </p>
        </section>
        <section className="faq" id="questions">
          <div>
            <span className="eyebrow">A FEW THINGS TO KNOW</span>
            <h2>Good questions.</h2>
          </div>
          <div className="faq-list">
            {[
              [
                "What do the numbers mean?",
                "They are a Unix timestamp: the number of milliseconds since January 1, 1970 at 00:00:00 UTC. It represents the same instant everywhere in the world, regardless of your time zone.",
              ],
              [
                "Exactly when is my timestamp captured?",
                "When you press “Make this moment yours,” the live preview freezes. Those exact thirteen digits are saved with your order and used to create the print. Taking your time in checkout will not change them.",
              ],
              [
                "What is the tee made from?",
                "Black, ring-spun cotton with a soft feel, a crew neck, and a white front print. The unisex fit uses the Gildan 64000; the fitted cut uses the Gildan 64000L. Check the size guide before choosing. The product image is an illustrative mockup; print placement and fit may vary.",
              ],
              [
                "Where do you ship?",
                isTest
                  ? "This edition is a sandbox: checkout accepts US addresses, but no physical products are shipped. The planned store includes free standard US shipping."
                  : "We offer free standard US shipping. Each tee is printed to order; production and transit times vary.",
              ],
              [
                "How should I care for it?",
                "Wash inside out on a cool cycle with similar colors. Avoid bleach and ironing the print. Hang dry to keep your moment looking its best.",
              ],
              [
                "Can I change or cancel an order?",
                isTest
                  ? "Test orders cost nothing and will not be shipped. You can return from Stripe before paying to choose a new fit, size, or moment. After checkout, keep your private order link to check its status."
                  : "Each tee is made to order. Before paying, use the back link in checkout to update your choices. For an order issue, contact us with the reference shown on your order page.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span className="faq-plus">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <a href="/" className="brand">
          datetime<span className="brand-dot">.</span>store
        </a>
        <div className="footer-links">
          <a href="/policies">Privacy & store policies</a>
          <a
            href="https://github.com/michelle/datetime.store"
            target="_blank"
            rel="noreferrer"
          >
            The original idea ↗
          </a>
        </div>
        <span>
          EST. 2017 — STILL COUNTING <ArrowUpRight size={13} />
        </span>
      </footer>
    </>
  );
}
