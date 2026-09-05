"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ShoppingBag,
  Clock3,
  Sparkles,
  Pause,
  Play,
  Check,
  X,
  Ruler,
  Plus,
  Minus,
  Truck,
  LockKeyhole,
  Heart,
  RotateCcw,
  LoaderCircle,
  MoveUpRight,
} from "lucide-react";
import { COLORS, SIZES, readableMoment, type Purchase } from "@/lib/catalog";

type Bag = Purchase;
export default function Store() {
  const [now, setNow] = useState<number | null>(null);
  const [frozen, setFrozen] = useState<number | null>(null);
  const [color, setColor] = useState<Purchase["color"]>("black");
  const [size, setSize] = useState<Purchase["size"]>("M");
  const [fit, setFit] = useState<Purchase["fit"]>("unisex");
  const [view, setView] = useState<"front" | "detail">("front");
  const [bag, setBag] = useState<Bag | null>(null);
  const [modal, setModal] = useState<"bag" | "size" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canceled, setCanceled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const moment = frozen ?? now;
  const selectedColor = COLORS.find((c) => c.id === color)!;
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 73);
    try {
      const saved = localStorage.getItem("datetime-bag");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.timestamp > Date.now() - 1_800_000 &&
          parsed.requestId &&
          SIZES.includes(parsed.size) &&
          COLORS.some((c) => c.id === parsed.color) &&
          ["unisex", "fitted"].includes(parsed.fit)
        )
          setBag(parsed);
        else localStorage.removeItem("datetime-bag");
      }
    } catch {
      /* Private browsing can disable storage. */
    }
    if (new URLSearchParams(location.search).get("checkout") === "canceled")
      setCanceled(true);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
    else if (!modal) dialog.current?.close();
  }, [modal]);
  function capture() {
    const timestamp = frozen ?? Date.now();
    setFrozen(timestamp);
    const next: Bag = {
      timestamp,
      color,
      size,
      fit,
      requestId: crypto.randomUUID(),
    };
    setBag(next);
    setError("");
    setModal("bag");
    try {
      localStorage.setItem("datetime-bag", JSON.stringify(next));
    } catch {}
  }
  function removeBag() {
    setBag(null);
    setFrozen(null);
    setError("");
    try {
      localStorage.removeItem("datetime-bag");
    } catch {}
  }
  async function checkout() {
    if (!bag || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bag),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Checkout could not start. Please try again.",
        );
      window.location.assign(data.url);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }
  function chooseFit(next: Purchase["fit"]) {
    setFit(next);
    if (next === "fitted" && color === "natural") setColor("black");
  }
  return (
    <>
      <a className="skip-link" href="#shop">
        Skip to the tee
      </a>
      <div className="announcement">
        <Sparkles size={13} />
        <span>GOOD THINGS TAKE TIME. THIS ONE TAKES A MOMENT.</span>
        <Sparkles size={13} />
      </div>
      <header className="site-header wrap">
        <a href="/" className="wordmark" aria-label="datetime.store home">
          <span className="brand-clock">
            <Clock3 strokeWidth={1.6} />
          </span>
          datetime<span className="wordmark-dot">.</span>store
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#little-details">The little details</a>
          <button className="bag-button" onClick={() => setModal("bag")}>
            <ShoppingBag size={17} />
            <span>Bag</span>
            <span className="bag-count">{bag ? 1 : 0}</span>
          </button>
        </nav>
      </header>
      <main>
        <section className="shop wrap" id="shop">
          <div className="hero-intro">
            <div>
              <p className="eyebrow">
                <span className="tiny-star">✳</span> THE ORIGINAL DATETIME
                T-SHIRT
              </p>
              <h1>
                Time flies. <em>Wear it.</em>
                <span className="heading-star" aria-hidden="true">
                  ✧
                </span>
              </h1>
            </div>
            <p className="intro-note">
              A fleeting moment.
              <br />A forever kind of tee.<span aria-hidden="true">↙</span>
            </p>
          </div>
          {canceled && (
            <div className="notice">
              <span>
                Your moment is still here. Pick up where you left off, or
                capture a new one.
              </span>
              <button
                onClick={() => setCanceled(false)}
                aria-label="Dismiss checkout notice"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="product-layout">
            <div className="product-gallery">
              <div
                className={`product-stage ${view === "detail" ? "detail-stage" : ""}`}
              >
                <div className="stage-meta">
                  <span>NO. 001 / THE NOW TEE</span>
                  <span className="live-pill">
                    <i className={frozen ? "paused" : ""} />
                    {frozen ? "MOMENT CAPTURED" : "LIVE PREVIEW"}
                  </span>
                </div>
                <div className="orbit orbit-one" aria-hidden="true" />
                <div className="orbit orbit-two" aria-hidden="true" />
                {view === "front" ? (
                  <div className={`tee-preview tee-${color} fit-${fit}`}>
                    {/* Generated mockup; the exact printable content is always rendered from the captured timestamp. */}
                    <img
                      className="tee-photo"
                      src="/images/tee-black.webp"
                      alt={`${selectedColor.name} ${fit} T-shirt with the current Unix timestamp printed across the chest`}
                      width="1254"
                      height="1254"
                      fetchPriority="high"
                    />
                    <span
                      className="tee-timestamp"
                      style={{ color: selectedColor.ink }}
                      aria-hidden="true"
                    >
                      {moment ?? "1788600000000"}
                    </span>
                  </div>
                ) : (
                  <div className={`print-detail ink-${color}`}>
                    <span className="detail-caption">
                      YOUR MOMENT, DOWN TO THE MILLISECOND
                    </span>
                    <span className="detail-number">
                      {moment ?? "1788600000000"}
                    </span>
                    <span className="detail-caption">
                      ONE LINE. A WHOLE LITTLE STORY.
                    </span>
                  </div>
                )}
                <span className="stage-spark spark-one" aria-hidden="true">
                  ✦
                </span>
                <span className="stage-spark spark-two" aria-hidden="true">
                  ✧
                </span>
                <div className="time-sticker" aria-hidden="true">
                  <Clock3 size={28} strokeWidth={1.3} />
                  <span>
                    HERE
                    <br />& NOW
                  </span>
                </div>
                <div className="stage-bottom">
                  <span className="handwritten">well, this is a moment.</span>
                  <button
                    className="round-button"
                    onClick={() => setFrozen(frozen ? null : Date.now())}
                    aria-label={frozen ? "Resume live time" : "Pause live time"}
                    title={frozen ? "Resume time" : "Pause time"}
                  >
                    {frozen ? <Play size={16} /> : <Pause size={16} />}
                  </button>
                </div>
              </div>
              <div className="gallery-bottom">
                <div className="view-tabs" aria-label="Product view">
                  <button
                    className={view === "front" ? "selected" : ""}
                    onClick={() => setView("front")}
                  >
                    The tee
                  </button>
                  <button
                    className={view === "detail" ? "selected" : ""}
                    onClick={() => setView("detail")}
                  >
                    The print <ArrowUpRight size={12} />
                  </button>
                </div>
                <p>Made to order. Made for your moment.</p>
              </div>
            </div>
            <div className="product-info">
              <p className="eyebrow muted">NOT JUST ANOTHER GRAPHIC TEE.</p>
              <div className="product-title">
                <h2>The Now Tee</h2>
                <span>
                  $32<span>.00</span>
                </span>
              </div>
              <p className="product-description">
                A little reminder that you were here.
                <br />
                The exact moment you click, captured in time
                <br className="desktop-br" /> and printed on ridiculously soft
                cotton.
              </p>
              <div className="moment-panel">
                <div className="moment-label">
                  <span className="status-dot" />
                  {frozen ? "YOUR CAPTURED MOMENT" : "THIS MOMENT, RIGHT NOW"}
                  <Clock3 size={13} />
                </div>
                <div className="moment-number" suppressHydrationWarning>
                  {moment ?? "·············"}
                </div>
                <div className="moment-date" suppressHydrationWarning>
                  {moment
                    ? readableMoment(moment)
                    : "A new moment is on its way…"}
                </div>
              </div>
              <fieldset className="color-field">
                <legend>
                  Color <span>— {selectedColor.name}</span>
                </legend>
                <div className="swatches">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      disabled={fit === "fitted" && c.id === "natural"}
                      className={`swatch ${color === c.id ? "active" : ""}`}
                      style={{ "--swatch": c.hex } as React.CSSProperties}
                      aria-label={c.name}
                      aria-pressed={color === c.id}
                      onClick={() => setColor(c.id)}
                    >
                      {color === c.id && <Check size={16} color={c.ink} />}
                    </button>
                  ))}
                  <span className="color-note">
                    {fit === "fitted"
                      ? "Two timeless shades."
                      : "Three timeless shades."}
                  </span>
                </div>
              </fieldset>
              <fieldset className="fit-field">
                <legend>Fit</legend>
                <div className="fit-options">
                  <button
                    className={fit === "unisex" ? "active" : ""}
                    onClick={() => chooseFit("unisex")}
                    aria-pressed={fit === "unisex"}
                  >
                    Unisex <span>Easy & everyday</span>
                  </button>
                  <button
                    className={fit === "fitted" ? "active" : ""}
                    onClick={() => chooseFit("fitted")}
                    aria-pressed={fit === "fitted"}
                  >
                    Fitted <span>A little more shape</span>
                  </button>
                </div>
              </fieldset>
              <fieldset className="size-field">
                <legend>Size</legend>
                <button
                  className="size-guide text-button"
                  onClick={() => setModal("size")}
                >
                  <Ruler size={14} /> Size guide
                </button>
                <div className="size-options">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      className={size === s ? "active" : ""}
                      onClick={() => setSize(s)}
                      aria-pressed={size === s}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button
                className="capture-button"
                onClick={capture}
                disabled={!now}
              >
                <span>Make this moment mine</span>
                <ArrowUpRight size={23} />
              </button>
              <p className="capture-note">
                <LockKeyhole size={12} /> Your timestamp freezes when you click.
              </p>
              <div className="product-promises">
                <span>
                  <Truck size={16} />
                  Free US shipping
                </span>
                <span>
                  <Heart size={15} />
                  Printed just for you
                </span>
              </div>
              {process.env.NEXT_PUBLIC_STORE_MODE !== "live" && (
                <p className="test-note">
                  You’re in our test shop. No real charges or shipments.
                </p>
              )}
            </div>
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          <div>
            <span>EVERY MILLISECOND IS A LIMITED EDITION</span>
            <span>✳</span>
            <span>BE HERE. WEAR NOW.</span>
            <span>✳</span>
            <span>TIME WELL WORN</span>
            <span>✳</span>
            <span>EVERY MILLISECOND IS A LIMITED EDITION</span>
            <span>✳</span>
          </div>
        </div>
        <section className="how-section wrap" id="how-it-works">
          <div className="section-heading">
            <p className="eyebrow">A SMALL IDEA ABOUT A BIG THING</p>
            <h2>
              You can’t stop time.
              <br />
              But you can <em>put it on a t-shirt.</em>
            </h2>
            <p>No big occasion required. An ordinary Tuesday counts, too.</p>
          </div>
          <div className="steps">
            <article>
              <div className="step-top">
                <span>01 / FIND YOUR NOW</span>
                <Clock3 size={30} strokeWidth={1.3} />
              </div>
              <h3>Life moves. So does the tee.</h3>
              <p>
                That number is the current Unix timestamp: every millisecond
                since January 1, 1970. It’s ticking along with you.
              </p>
            </article>
            <article>
              <div className="step-top">
                <span>02 / CATCH IT</span>
                <Sparkles size={30} strokeWidth={1.3} />
              </div>
              <h3>One click. One tiny time capsule.</h3>
              <p>
                Choose your color, fit, and size. Click the button, and your
                moment stops changing. That exact number is yours.
              </p>
            </article>
            <article>
              <div className="step-top">
                <span>03 / WEAR THE MEMORY</span>
                <ShoppingBag size={29} strokeWidth={1.3} />
              </div>
              <h3>A moment you can live in.</h3>
              <p>
                We print your timestamp on a soft tee, just for you. A
                conversation starter. A keepsake. Your new favorite.
              </p>
            </article>
          </div>
        </section>
        <section className="story-section wrap">
          <div className="story-photo">
            <img
              src="/images/tee-reference.jpg"
              alt="Close-up of the soft cotton and easy crewneck fit of the Gildan 64000 tee"
              width="1600"
              height="1600"
              loading="lazy"
            />
            <span className="photo-label">SOFT COTTON. HARD TO FORGET.</span>
          </div>
          <div className="story-copy">
            <span className="story-flower" aria-hidden="true">
              ✳
            </span>
            <p className="eyebrow">A SOUVENIR OF RIGHT NOW</p>
            <h2>
              For the big days.
              <br />
              And the <em>just-because days.</em>
            </h2>
            <p>
              The first day of something. The last day of something else. Or a
              perfectly unremarkable afternoon you’d like to keep.
            </p>
            <p>
              Not everything needs a meaning.
              <br />
              Sometimes, it just needs a really good t-shirt.
            </p>
            <a href="#shop" className="underlined-link">
              Find your moment <ArrowUpRight size={19} />
            </a>
          </div>
        </section>
        <section className="faq-section wrap" id="little-details">
          <div>
            <p className="eyebrow">THE LITTLE DETAILS</p>
            <h2>
              Good questions.
              <br />
              <em>Timely answers.</em>
            </h2>
            <span className="faq-doodle" aria-hidden="true">
              ✺
            </span>
          </div>
          <div className="faq-list">
            {[
              [
                "What does the number on my tee mean?",
                "It’s Unix time in milliseconds: the number of milliseconds that have passed since January 1, 1970 at 00:00:00 UTC. Every number points to one exact instant, anywhere in the world. The readable date underneath the preview translates it for you.",
              ],
              [
                "When does my timestamp stop changing?",
                "The instant you click “Make this moment mine.” You’ll see your frozen timestamp in the bag before continuing to Stripe. You can also pause the preview to catch a moment first. A captured moment stays available for 30 minutes before starting checkout.",
              ],
              [
                "What is the tee like?",
                "The unisex tee is a Gildan 64000 Softstyle with an easy regular fit. The fitted tee is a Gildan 64000L with a shaped silhouette. Our solid colors are soft cotton. Choose a size using the garment measurements in the size guide; size up for more room. The preview is an illustrative mockup—fabric tone and print placement may vary slightly.",
              ],
              [
                "Where do you ship, and how long does it take?",
                "We currently offer free standard shipping within the United States. Each tee is printed to order by Prodigi. Allow approximately 7–14 business days for printing and delivery; this is an estimate, not a guarantee. This test shop uses sandbox fulfillment, so test orders won’t be printed or shipped.",
              ],
              [
                "How do I care for my moment?",
                "Turn your tee inside out and machine wash cold with similar colors. Use a gentle cycle, skip bleach, and line dry or tumble dry low. Avoid ironing directly over the print. Time fades enough things already.",
              ],
              [
                "Can I return a personalized tee?",
                "Each tee is made with your unique timestamp, so please check your size and captured moment before paying. For the live store, damaged or misprinted items should be reviewed for replacement. This is currently a test shop; no physical goods are sold or shipped. See the store policies for the current status.",
              ],
            ].map(([question, answer], i) => (
              <article
                className={`faq-item ${openFaq === i ? "open" : ""}`}
                key={question}
              >
                <h3>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    aria-controls={`answer-${i}`}
                  >
                    {question}
                    {openFaq === i ? <Minus size={18} /> : <Plus size={18} />}
                  </button>
                </h3>
                <div id={`answer-${i}`} hidden={openFaq !== i}>
                  <p>{answer}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="closing">
          <span aria-hidden="true">✧</span>
          <p>Of all the moments in the universe,</p>
          <h2>
            we’re glad you’re in <em>this one.</em>
          </h2>
          <a href="#shop">
            Make it a keepsake <MoveUpRight size={18} />
          </a>
          <span className="closing-star" aria-hidden="true">
            ✦
          </span>
        </section>
      </main>
      <footer className="wrap">
        <a className="wordmark" href="/">
          datetime<span className="wordmark-dot">.</span>store
        </a>
        <p>A little shop for the present tense.</p>
        <div>
          <a href="/policies">Store policies</a>
          <span>© {new Date().getFullYear()} · Made in the moment.</span>
        </div>
      </footer>
      <dialog
        aria-labelledby="dialog-title"
        ref={dialog}
        className={`store-dialog ${modal === "size" ? "size-dialog" : ""}`}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setModal(null);
        }}
        onClick={(e) => {
          if (e.target === dialog.current && !busy) setModal(null);
        }}
      >
        <button
          className="dialog-close round-button"
          disabled={busy}
          onClick={() => setModal(null)}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        {modal === "size" ? (
          <>
            <p className="eyebrow">A LITTLE ROOM FOR YOUR MOMENT</p>
            <h2 id="dialog-title">Find your fit.</h2>
            <p className="dialog-description">
              Garment measurements in inches, laid flat. Compare with a tee you
              love. Allow about 1 inch of variation.
            </p>
            <div className="fit-options">
              <button
                className={fit === "unisex" ? "active" : ""}
                onClick={() => chooseFit("unisex")}
              >
                Unisex
              </button>
              <button
                className={fit === "fitted" ? "active" : ""}
                onClick={() => chooseFit("fitted")}
              >
                Fitted
              </button>
            </div>
            <table>
              <caption>
                {fit === "unisex" ? "Gildan 64000" : "Gildan 64000L"} sizing
              </caption>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Width</th>
                  <th>Length</th>
                </tr>
              </thead>
              <tbody>
                {SIZES.map((s, i) => (
                  <tr key={s}>
                    <th>{s}</th>
                    <td>
                      {fit === "unisex"
                        ? [18, 20, 22, 24, 26][i]
                        : [16, 17, 18.5, 19.5, 22][i]}
                      ″
                    </td>
                    <td>
                      {fit === "unisex"
                        ? [28, 29, 30, 31, 32][i]
                        : [25.25, 26.25, 27.25, 28, 28.5][i]}
                      ″
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="size-tip">
              <Ruler size={18} /> Between sizes? Size up for a more relaxed fit.
            </p>
            <button className="capture-button" onClick={() => setModal(null)}>
              Back to my tee <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">A LITTLE TIME CAPSULE</p>
            <h2 id="dialog-title">
              {bag ? "You caught a moment." : "Room for a moment."}
            </h2>
            {bag ? (
              <>
                <p className="dialog-description">
                  The clock keeps going. This one stays with you.
                </p>
                <div className="bag-item">
                  <div className={`mini-tee tee-${bag.color}`}>
                    <img
                      className="tee-photo"
                      src="/images/tee-black.webp"
                      alt="Your selected timestamp tee"
                      width="1254"
                      height="1254"
                    />
                    <span
                      style={{
                        color: COLORS.find((c) => c.id === bag.color)!.ink,
                      }}
                    >
                      {bag.timestamp}
                    </span>
                  </div>
                  <div>
                    <h3>The Now Tee</h3>
                    <p>
                      {COLORS.find((c) => c.id === bag.color)!.name} ·{" "}
                      {bag.fit === "unisex" ? "Unisex" : "Fitted"} · {bag.size}
                    </p>
                    <b>$32.00</b>
                  </div>
                </div>
                <div className="bag-moment">
                  <span className="eyebrow">YOURS, FOREVER</span>
                  <strong>{bag.timestamp}</strong>
                  <span>{readableMoment(bag.timestamp)}</span>
                </div>
                <div className="bag-totals">
                  <span>Shipping</span>
                  <b>On us</b>
                  <span>
                    Total <small>USD</small>
                  </span>
                  <strong>$32.00</strong>
                </div>
                {error && (
                  <p role="alert" className="error-message">
                    {error}
                  </p>
                )}
                <button
                  className="capture-button"
                  onClick={checkout}
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <LoaderCircle className="spin" size={19} /> Opening secure
                      checkout…
                    </>
                  ) : (
                    <>
                      Continue to checkout <ArrowUpRight size={20} />
                    </>
                  )}
                </button>
                <p className="capture-note">
                  <LockKeyhole size={12} /> Secure checkout with Stripe
                  {process.env.NEXT_PUBLIC_STORE_MODE !== "live"
                    ? " · Test mode"
                    : ""}
                </p>
                <button
                  className="start-over text-button"
                  disabled={busy}
                  onClick={() => {
                    removeBag();
                    setModal(null);
                  }}
                >
                  <RotateCcw size={13} /> Let this one go & catch another
                </button>
              </>
            ) : (
              <>
                <p className="dialog-description">
                  Your bag is empty. There’s a whole universe of moments out
                  there. Let’s find yours.
                </p>
                <div className="empty-bag">
                  <Clock3 size={72} strokeWidth={1} />
                  <span>Every moment is a fresh start.</span>
                </div>
                <button
                  className="capture-button"
                  onClick={() => setModal(null)}
                >
                  Find my moment <ArrowRight size={20} />
                </button>
              </>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
