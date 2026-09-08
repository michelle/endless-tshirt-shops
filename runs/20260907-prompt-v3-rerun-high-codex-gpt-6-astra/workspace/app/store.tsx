"use client";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Compass,
  Leaf,
  Lock,
  Package,
  Plus,
} from "lucide-react";
import {
  defaultDesign,
  designSchema,
  palettes,
  type Design,
} from "@/lib/design";
const artUrl = (d: Design) =>
  "/api/artwork?design=" + encodeURIComponent(JSON.stringify(d));
export default function Store({
  testMode,
  checkoutReady,
}: {
  testMode: boolean;
  checkoutReady: boolean;
}) {
  const [design, setDesign] = useState<Design>(defaultDesign),
    [preview, setPreview] = useState(defaultDesign),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [view, setView] = useState("shirt"),
    [saved, setSaved] = useState(false),
    [canceled, setCanceled] = useState(false),
    [loaded, setLoaded] = useState(false),
    [imageError, setImageError] = useState(false);
  useEffect(() => {
    try {
      const parsed = designSchema.safeParse(
        JSON.parse(localStorage.getItem("field-notes-design") || "null"),
      );
      if (parsed.success) {
        setDesign(parsed.data);
        setPreview(parsed.data);
      }
    } catch {}
    setLoaded(true);
    setCanceled(new URLSearchParams(location.search).has("canceled"));
  }, []);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "personalize_park_tee",
            description:
              "Update the visible personal park tee design and preview. Saves locally; does not place an order or start payment.",
            inputSchema: {
              type: "object",
              properties: {
                place: { type: "string", maxLength: 24 },
                name: { type: "string", maxLength: 22 },
                year: { type: "string" },
                phrase: { type: "string", maxLength: 36 },
                palette: { type: "string", enum: ["forest", "dusk", "canyon"] },
                size: { type: "string", enum: ["s", "m", "l", "xl", "2xl"] },
              },
              required: ["place", "name", "year", "phrase", "palette", "size"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            execute(input: unknown) {
              const next = designSchema.parse(input);
              flushSync(() => {
                setDesign(next);
                setPreview(next);
                setError("");
              });
              document.getElementById("studio")?.scrollIntoView();
              return { configured: true, design: next, totalUSD: 44 };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("field-notes-design", JSON.stringify(design));
      setSaved(true);
    } catch {
      setSaved(false);
    }
    const timer = setTimeout(() => {
      if (designSchema.safeParse(design).success) {
        setPreview(design);
        setImageError(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [design, loaded]);
  const change = (key: keyof Design, value: string) => {
    setError("");
    setDesign((d) => ({ ...d, [key]: value }));
  };
  async function checkout() {
    const parsed = designSchema.safeParse(design);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open checkout");
      setBusy(false);
    }
  }
  return (
    <>
      <div className="announcement">
        MADE FOR YOUR MEMORIES. PRINTED JUST FOR YOU.{" "}
        <span>US SHIPPING · $6 FLAT RATE</span>
      </div>
      <header>
        <a className="brand" href="/" aria-label="Field Notes Club home">
          <Compass size={31} strokeWidth={1.5} />
          <span>
            FIELD NOTES<small>CLUB — EST. 2026</small>
          </span>
        </a>
        <nav>
          <a href="#studio">The personal park tee</a>
          <a href="#how">How it works</a>
          <a href="#details">The details</a>
        </nav>
        <a href="#studio" className="nav-cta">
          Make it yours <ArrowUpRight size={17} />
        </a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> SOUVENIRS OF A LIFE WELL LIVED
            </div>
            <h1>
              Your place.
              <br />
              Your people.
              <br />
              <em>Your park.</em>
            </h1>
            <p>
              Some places stay with you. Turn yours into a one-of-a-kind park
              tee, complete with your people, your year, and your own little
              motto.
            </p>
            <a className="button" href="#studio">
              Create your personal park <ArrowUpRight size={19} />
            </a>
            <div className="hero-note">
              <span>01 / THE PERSONAL PARK COLLECTION</span>
              <span>DESIGNED BY YOU. WORN EVERYWHERE.</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="edition">
              ONE PLACE.
              <br />
              ENDLESS STORIES.
            </div>
            <div className="shirt-mock">
              <img
                className="blank"
                src="/assets/blank-shirt.png"
                alt="White cotton t-shirt"
              />
              <img
                className="shirt-print"
                src={artUrl(defaultDesign)}
                alt="Big Sur personal park print on a white shirt"
              />
            </div>
            <div className="photo-caption">
              <span>THE PERSONAL PARK TEE</span>
              <span>$38</span>
            </div>
            <div className="round-stamp">
              YOUR STORY
              <br />
              <span>✳</span>
              <br />
              MADE TO WEAR
            </div>
          </div>
        </section>
        <div className="value-strip">
          <span>
            <Compass /> Entirely your own
          </span>
          <span>
            <Leaf /> Soft ring-spun cotton
          </span>
          <span>
            <Package /> Printed to order
          </span>
          <span>
            <Check /> Full-color DTG printing
          </span>
        </div>
        <section id="studio" className="studio section">
          <div className="section-head">
            <div>
              <div className="eyebrow">THE DESIGN STUDIO</div>
              <h2>
                A little wild.
                <br />A lot of <em>you.</em>
              </h2>
            </div>
            <p>
              A hometown. A first trip. That spot you always go back to.
              <br />
              Start with a place that means something.
            </p>
          </div>
          <div className="studio-grid">
            <div className="preview-panel">
              <div className="preview-top">
                <span>
                  <i /> LIVE PREVIEW
                </span>
                <div className="view-toggle">
                  <button
                    aria-pressed={view === "shirt"}
                    onClick={() => setView("shirt")}
                  >
                    On the tee
                  </button>
                  <button
                    aria-pressed={view === "print"}
                    onClick={() => setView("print")}
                  >
                    The artwork
                  </button>
                </div>
              </div>
              <div
                className={
                  "design-preview " + (view === "print" ? "art-only" : "")
                }
              >
                {view === "shirt" ? (
                  <div className="shirt-mock">
                    <img
                      className="blank"
                      src="/assets/blank-shirt.png"
                      alt="White crewneck t-shirt mockup"
                    />
                    <img
                      className="shirt-print"
                      src={artUrl(preview)}
                      onError={() => setImageError(true)}
                      alt={`Your design: ${preview.place}, ${preview.name}, ${preview.year}, ${preview.phrase}`}
                    />
                  </div>
                ) : (
                  <img
                    src={artUrl(preview)}
                    onError={() => setImageError(true)}
                    alt={`Personalized ${preview.place} park artwork`}
                  />
                )}
              </div>
              <div className="preview-bottom">
                <span>WHITE / UNISEX SOFTSTYLE</span>
                <span>
                  {saved
                    ? "DESIGN SAVED ON THIS DEVICE"
                    : "YOUR STORY STARTS HERE"}
                </span>
              </div>
              <p className="preview-disclaimer">
                {imageError
                  ? "Preview could not load. Please refresh before ordering."
                  : "Illustrative mockup. Print placement and colors may vary slightly. Landscape is original artwork, not a geographic depiction."}
              </p>
            </div>
            <form
              className="customizer"
              onSubmit={(e) => {
                e.preventDefault();
                checkout();
              }}
            >
              <div className="product-title">
                <h3>The Personal Park Tee</h3>
                <span>$38</span>
              </div>
              <p className="product-subtitle">
                Your memories, with a fresh-air kind of feeling.
              </p>
              <fieldset>
                <legend>
                  <b>01</b> Tell your story
                </legend>
                <label htmlFor="place">
                  Your place <span>{design.place.length}/24</span>
                </label>
                <input
                  id="place"
                  value={design.place}
                  maxLength={24}
                  onChange={(e) => change("place", e.target.value)}
                  placeholder="e.g. BIG SUR"
                  required
                />
                <div className="input-row">
                  <div>
                    <label htmlFor="name">Your people</label>
                    <input
                      id="name"
                      value={design.name}
                      maxLength={22}
                      onChange={(e) => change("name", e.target.value)}
                      placeholder="e.g. THE PARKER FAMILY"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="year">Your year</label>
                    <input
                      id="year"
                      value={design.year}
                      maxLength={4}
                      pattern="(19|20)[0-9]{2}"
                      inputMode="numeric"
                      onChange={(e) => change("year", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <label htmlFor="phrase">
                  Your motto <span>{design.phrase.length}/36</span>
                </label>
                <input
                  id="phrase"
                  value={design.phrase}
                  maxLength={36}
                  onChange={(e) => change("phrase", e.target.value)}
                  required
                />
                <small>English letters, numbers, and simple punctuation.</small>
              </fieldset>
              <fieldset>
                <legend>
                  <b>02</b> Set the mood
                </legend>
                <div className="palettes">
                  {Object.entries(palettes).map(([key, p]) => (
                    <button
                      type="button"
                      key={key}
                      className={design.palette === key ? "selected" : ""}
                      onClick={() => change("palette", key)}
                      aria-pressed={design.palette === key}
                    >
                      <i
                        style={{
                          background: `linear-gradient(135deg,${p.paper} 50%,${p.ink} 50%)`,
                        }}
                      />
                      {p.label}
                      {design.palette === key && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>
                  <b>03</b> Find your fit{" "}
                  <a
                    href="#size-guide"
                    onClick={() => {
                      const el = document.getElementById(
                        "size-guide",
                      ) as HTMLDetailsElement;
                      if (el) el.open = true;
                    }}
                  >
                    Size guide ↗
                  </a>
                </legend>
                <div className="sizes">
                  {["s", "m", "l", "xl", "2xl"].map((size) => (
                    <button
                      type="button"
                      aria-pressed={design.size === size}
                      key={size}
                      className={design.size === size ? "selected" : ""}
                      onClick={() => change("size", size)}
                    >
                      {size.toUpperCase()}
                    </button>
                  ))}
                </div>
                <small>
                  White · Unisex · Semi-fitted · 100% ring-spun cotton
                </small>
              </fieldset>
              <div className="order-total">
                <span>1 custom tee + US shipping</span>
                <strong>$44.00</strong>
              </div>
              {testMode && (
                <p className="test-note">
                  TEST STORE · No real charges or shipments.
                  {!checkoutReady && " Checkout opens after payment setup."}
                </p>
              )}
              {canceled && (
                <p className="notice">
                  Checkout canceled. Your design is still here and no order was
                  sent to print.
                </p>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button checkout"
                disabled={busy || imageError}
                type="submit"
              >
                {busy
                  ? "Preparing secure checkout…"
                  : testMode
                    ? "Continue to test checkout"
                    : "Continue to checkout"}
                <ArrowRight size={19} />
              </button>
              <p className="secure">
                <Lock size={12} /> Secure checkout with Stripe · Please review
                your text
              </p>
            </form>
          </div>
        </section>
        <section id="how" className="how section">
          <div className="eyebrow">FROM A MEMORY TO YOUR EVERYDAY FAVORITE</div>
          <h2>
            Not just another
            <br />
            <em>souvenir.</em>
          </h2>
          <div className="steps">
            <article>
              <span>01</span>
              <h3>Make it personal.</h3>
              <p>
                Name your place, add your people, and choose the words that take
                you back. Watch your print come to life.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>We make your one.</h3>
              <p>
                Your exact design is printed in full color on a soft cotton tee.
                Every shirt starts with your order.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Take it everywhere.</h3>
              <p>
                A small reminder of somewhere special. Made to join you for
                coffee runs, weekend escapes, and all the in-between.
              </p>
            </article>
          </div>
        </section>
        <section id="details" className="details section">
          <div>
            <div className="eyebrow">GOOD TO KNOW</div>
            <h2>
              Made with care.
              <br />
              <em>Worn with a story.</em>
            </h2>
            <p>Original art. Your words. A seriously comfortable tee.</p>
          </div>
          <div className="faq">
            <details open>
              <summary>
                The tee itself <Plus size={18} />
              </summary>
              <p>
                Gildan 64000 Softstyle in white. Lightweight 100% ring-spun
                cotton, crew neck, short sleeves, and a semi-fitted unisex
                shape. Printed on the front using direct-to-garment technology.
              </p>
            </details>
            <details>
              <summary>
                Printing & delivery <Plus size={18} />
              </summary>
              <p>
                We ship within the United States for $6 per shirt. Production
                typically takes 3–5 business days, plus carrier transit.
                Delivery dates are estimates. While this store is in test mode,
                nothing is physically printed or shipped.
              </p>
            </details>
            <details>
              <summary>
                Personalization & care <Plus size={18} />
              </summary>
              <p>
                Every design uses your exact approved text with our original
                landscape illustration. Double-check spelling before checkout.
                Wash inside out at a low temperature. Tumble dry low or hang
                dry; do not iron directly on the print.
              </p>
            </details>
            <details id="size-guide">
              <summary>
                Size guide <Plus size={18} />
              </summary>
              <p>
                Body chest circumference to fit, in inches. For a looser fit,
                consider sizing up.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Chest to fit</th>
                    <th>Length</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["S", "34", "28"],
                    ["M", "38", "29.2"],
                    ["L", "42", "30.2"],
                    ["XL", "46", "31.2"],
                    ["2XL", "50", "32.5"],
                  ].map((row) => (
                    <tr key={row[0]}>
                      {row.map((v, i) => (
                        <td key={i}>
                          {v}
                          {i > 0 ? "″" : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <details>
              <summary>
                Orders, privacy & returns <Plus size={18} />
              </summary>
              <p>
                Your design is saved on this device and with your Stripe
                checkout. Stripe processes payment and contact information;
                Prodigi receives your design and shipping details only after
                payment. Keep the confirmation link to check your order. This
                sandbox store does not accept real purchases. Customer support,
                the merchant’s full privacy terms, and a returns policy must be
                published before live sales open.
              </p>
            </details>
          </div>
        </section>
      </main>
      <footer>
        <a className="brand" href="/">
          <Compass size={30} />
          <span>
            FIELD NOTES<small>CLUB — EST. 2026</small>
          </span>
        </a>
        <p>For the places that make us.</p>
        <span>© 2026 FIELD NOTES CLUB {testMode && "· TEST EDITION"}</span>
        <a href="#studio">
          Make something yours <ArrowUpRight size={16} />
        </a>
      </footer>
    </>
  );
}
