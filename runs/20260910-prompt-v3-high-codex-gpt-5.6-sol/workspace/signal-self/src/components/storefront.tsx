"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Check, LoaderCircle, Minus, Plus, Sparkles } from "lucide-react";
import { GARMENTS, PALETTES, SIZES, customizationSchema } from "@/lib/product";

type PaletteKey = keyof typeof PALETTES;
type GarmentKey = keyof typeof GARMENTS;

export function Storefront() {
  const [phrase, setPhrase] = useState("MAKE ROOM FOR WONDER");
  const [detail, setDetail] = useState("34.0522° N · 118.2437° W");
  const [palette, setPalette] = useState<PaletteKey>("tide");
  const [garment, setGarment] = useState<GarmentKey>("black");
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const colors = PALETTES[palette];
  const garmentColor = GARMENTS[garment];

  const configuration = { phrase, detail, palette, garment, size, quantity };

  async function startCheckout() {
    setError("");
    const parsed = customizationSchema.safeParse(configuration);
    if (!parsed.success) {
      setError("Add at least three characters to your signal and choose a detail.");
      return;
    }
    setCheckoutState("loading");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Checkout could not be opened.");
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be opened.");
      setCheckoutState("idle");
    }
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool({
      name: "configure_signal_shirt",
      title: "Configure Signal Shirt",
      description: "Stage a personalized Signal / Self shirt design in the visible studio without starting payment.",
      inputSchema: {
        type: "object",
        properties: {
          phrase: { type: "string", minLength: 3, maxLength: 34 },
          detail: { type: "string", minLength: 2, maxLength: 42 },
          palette: { type: "string", enum: ["tide", "solar", "aura"] },
          garment: { type: "string", enum: ["black", "white", "navy blue"] },
          size: { type: "string", enum: [...SIZES] },
          quantity: { type: "integer", minimum: 1, maximum: 5 },
        },
        required: ["phrase", "detail", "palette", "garment", "size", "quantity"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const next = customizationSchema.parse(input);
        setPhrase(next.phrase.toUpperCase()); setDetail(next.detail.toUpperCase()); setPalette(next.palette); setGarment(next.garment); setSize(next.size); setQuantity(next.quantity); setError("");
        document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
        return { status: "configured", design: next };
      },
    }, { signal: lifecycle.signal });
    void Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Signal Self home">
          <span className="brand-mark" aria-hidden="true">S/S</span>
          SIGNAL / SELF
        </a>
        <a className="header-link" href="#story">The idea <ArrowRight size={16} /></a>
      </header>

      <section className="builder" id="top">
        <div className="intro">
          <p className="eyebrow"><Sparkles size={15} /> One shirt. Your coordinates.</p>
          <h1>Wear the signal<br />only you can send.</h1>
          <p className="lede">Turn the words, place, or date that keeps you moving into a one-of-one topographic print.</p>
          <div className="proof-row">
            <span><Check size={15} /> Premium cotton</span>
            <span><Check size={15} /> Printed to order</span>
            <span><Check size={15} /> Tracked delivery</span>
          </div>
        </div>

        <div className="studio-shell">
          <div className="preview-column">
            <div className="preview-label"><span>01</span> LIVE PRINT PREVIEW</div>
            <div className={`print-preview garment-${garment.replace(" ", "-")}`} style={{ "--accent-a": colors.start, "--accent-b": colors.end, "--garment": garmentColor.swatch, "--print-text": garmentColor.text } as React.CSSProperties}>
              <div className="contours" aria-hidden="true" />
              <div className="print-copy">
                <strong>{phrase || "YOUR WORDS HERE"}</strong>
                <span>{detail || "YOUR PLACE · YOUR MOMENT"}</span>
              </div>
              <span className="edition">ONE / ONE</span>
            </div>
            <p className="preview-note">Your final artwork is rendered at print resolution after checkout.</p>
          </div>

          <div className="controls">
            <div className="step-title"><span>02</span><div><strong>Make it yours</strong><small>Every field changes your final print.</small></div></div>
            <label>
              <span>Your signal <em>{phrase.length}/34</em></span>
              <input value={phrase} maxLength={34} onChange={(event) => setPhrase(event.target.value.toUpperCase())} placeholder="A phrase you live by" />
            </label>
            <label>
              <span>Coordinates, date, or detail <em>{detail.length}/42</em></span>
              <input value={detail} maxLength={42} onChange={(event) => setDetail(event.target.value.toUpperCase())} placeholder="A place or moment" />
            </label>
            <fieldset>
              <legend>Color signal</legend>
              <div className="palette-grid">
                {(Object.keys(PALETTES) as PaletteKey[]).map((key) => (
                  <button type="button" className={palette === key ? "selected" : ""} onClick={() => setPalette(key)} key={key}>
                    <i style={{ background: `linear-gradient(135deg, ${PALETTES[key].start}, ${PALETTES[key].end})` }} />
                    {PALETTES[key].name}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Shirt color</legend>
              <div className="garment-grid">
                {(Object.keys(GARMENTS) as GarmentKey[]).map((key) => (
                  <button type="button" className={garment === key ? "selected" : ""} onClick={() => setGarment(key)} key={key}>
                    <i style={{ background: GARMENTS[key].swatch }} /> {GARMENTS[key].name}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Unisex size</legend>
              <div className="size-grid">
                {SIZES.map((item) => (
                  <button type="button" className={size === item ? "selected" : ""} onClick={() => setSize(item)} key={item}>{item}</button>
                ))}
              </div>
            </fieldset>
            <div className="quantity-row"><span>Quantity</span><div><button aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={14} /></button><strong>{quantity}</strong><button aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(5, value + 1))}><Plus size={14} /></button></div></div>
            <button type="button" className="buy-button" onClick={startCheckout} disabled={checkoutState === "loading"}>
              {checkoutState === "loading" ? <><LoaderCircle className="spin" size={19} /> Opening secure checkout</> : <>Checkout · ${(42 * quantity).toFixed(0)} <ArrowRight size={19} /></>}
            </button>
            {error && <p className="checkout-error" role="alert">{error}</p>}
            <p className="secure-note">Secure checkout · $5 flat-rate shipping</p>
          </div>
        </div>
      </section>

      <section className="story" id="story">
        <div className="story-image"><Image src="/assets/signal-shirt.png" alt="Black Signal Self shirt with a luminous custom topographic print" fill sizes="(max-width: 800px) 100vw, 44vw" /></div>
        <div className="story-copy">
          <p className="eyebrow">A map of what matters</p>
          <h2>Not merch.<br />A personal landmark.</h2>
          <p>Your words become the center of a unique contour field, balanced by the place or moment behind them. No inventory, no repeated design—just your signal, printed once.</p>
          <dl>
            <div><dt>01</dt><dd><strong>You compose</strong><span>Choose your phrase, detail, and color mood.</span></dd></div>
            <div><dt>02</dt><dd><strong>We render</strong><span>Your artwork is prepared at 300 DPI for DTG.</span></dd></div>
            <div><dt>03</dt><dd><strong>Prodigi prints</strong><span>Made on a Bella+Canvas 3001 and shipped direct.</span></dd></div>
          </dl>
        </div>
      </section>

      <section className="service-notes" aria-label="Order details">
        <article><span>FIT</span><h3>Modern unisex</h3><p>Bella+Canvas 3001. Order your usual size; size up for a relaxed fit.</p></article>
        <article><span>DELIVERY</span><h3>Made, then shipped</h3><p>Allow 3–5 working days to print, then 5–10 working days in transit.</p></article>
        <article><span>RETURNS</span><h3>Made for you</h3><p>We replace damaged or misprinted orders. Personalized items can’t be returned for a change of mind.</p></article>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-mark">S/S</span>SIGNAL / SELF</a><p>Personal landmarks, printed one at a time.</p></footer>
    </main>
  );
}
