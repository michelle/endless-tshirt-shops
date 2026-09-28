"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GARMENT_COLORS,
  INK_COLORS,
  SIZES,
  WAVEFORM_STYLES,
  priceCents,
  sizeLabel,
} from "@/lib/catalog";
import type { Size, WaveformStyle } from "@/lib/catalog";
import ShirtPreview from "@/components/ShirtPreview";
import OrderStatus from "@/components/OrderStatus";
import { demoSamples, samplesFromBlob } from "@/components/audio";

const CHARCOAL = "#232323";
const WHITE = "#fbfbf8";
const LIGHT_GARMENTS = new Set(["white", "cream", "athletic grey heather"]);

export default function Home() {
  const [samples, setSamples] = useState<number[] | null>(null);
  const [soundLabel, setSoundLabel] = useState<string | null>(null);
  const [style, setStyle] = useState<WaveformStyle>("line");
  const [ink, setInk] = useState(CHARCOAL);
  const [color, setColor] = useState(GARMENT_COLORS[0].prodigi);
  const [size, setSize] = useState<Size>("m");
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("session_id");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("cancelled=1")) {
      setCancelled(true);
      document.getElementById("designer")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    },
    []
  );

  const garment = GARMENT_COLORS.find((c) => c.prodigi === color)!;

  function pickColor(value: string) {
    setColor(value);
    // keep the print legible when switching between light/dark garments
    setInk(LIGHT_GARMENTS.has(value) ? CHARCOAL : WHITE);
    const g = GARMENT_COLORS.find((c) => c.prodigi === value)!;
    if (!g.sizes.includes(size)) {
      setSize(g.sizes.includes("m") ? "m" : (g.sizes[0] as Size));
    }
  }

  async function startRecording() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setLevel(0);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        try {
          const s = await samplesFromBlob(blob);
          setSamples(s);
          setSoundLabel("your recording");
        } catch {
          setErr("Couldn't decode that recording — try again or upload a file instead.");
        }
      };
      rec.start();
      setRecording(true);
      setSoundLabel(null);

      // live input meter
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        setLevel(Math.min(100, (peak / 128) * 140));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setErr("Microphone access was blocked — allow the mic, or upload an audio file below.");
    }
  }

  function stopRecording() {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
    recorderRef.current?.stop();
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setErr(null);
    try {
      const s = await samplesFromBlob(file);
      setSamples(s);
      setSoundLabel(file.name);
    } catch {
      setErr("Couldn't decode that file — MP3, WAV, M4A and OGG all work.");
    }
  }

  async function onDemo() {
    setErr(null);
    setSamples(await demoSamples());
    setSoundLabel("demo phrase “LOVE” in Morse tones");
  }

  async function checkout() {
    if (!samples) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design: { samples, style, ink, color, size } }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "checkout failed");
      window.location.href = json.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Checkout failed — please try again.");
      setBusy(false);
    }
  }

  const price = priceCents(size);

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <a className="brand" href="#top">
            Echo<span>stitch</span>
          </a>
          <span className="header-note">One-of-one tees, printed on demand · free worldwide shipping</span>
        </div>
      </header>

      <main id="top">
        <section className="hero wrap">
          <h1>
            Wear the sound of
            <br />
            <em>someone you love.</em>
          </h1>
          <p className="sub">
            Record a voice, a laugh, a dog&apos;s bark, the chorus of your song — we turn it
            into a waveform that exists exactly once in the universe, and print it on a
            premium cotton tee just for you. Direct-to-garment, made to order, shipped
            worldwide.
          </p>
          <div className="cta-row">
            <a href="#designer" className="btn btn-primary">
              Create yours
            </a>
            <a href="#how" className="btn btn-ghost">
              How it works
            </a>
          </div>
        </section>

        <section className="how wrap" id="how">
          <h2 className="section-title">Three steps to a shirt nobody else owns</h2>
          <p className="section-sub">Every order is printed once, for one person, from one sound.</p>
          <div className="steps">
            <div className="step">
              <span className="num">1</span>
              <h3>Capture a sound</h3>
              <p>Record straight in your browser or upload an audio file. No two recordings
                ever produce the same shape.</p>
            </div>
            <div className="step">
              <span className="num">2</span>
              <h3>Design your print</h3>
              <p>Choose the waveform style, ink color, garment color and size. Watch the
                print preview update live — what you see is what ships.</p>
            </div>
            <div className="step">
              <span className="num">3</span>
              <h3>We print &amp; ship</h3>
              <p>After checkout your sound is rendered as a high-resolution print file and
                sent to our DTG print lab. You get live production status and tracking.</p>
            </div>
          </div>
        </section>

        {sessionId && (
          <div className="wrap">
            <OrderStatus sessionId={sessionId} />
          </div>
        )}

        <section className="designer wrap" id="designer">
          <h2 className="section-title">Design your tee</h2>
          <p className="section-sub">
            {cancelled ? "Checkout was cancelled — your design is still here." : "It takes about a minute."}
          </p>
          <div className="designer-grid">
            <div>
              <div className="card">
                <h3>
                  1 · Your sound <small>— record, upload, or try the demo</small>
                </h3>
                <div className="capture-row">
                  <button
                    type="button"
                    className={`capture-btn ${recording ? "recording" : ""}`}
                    onClick={recording ? stopRecording : startRecording}
                  >
                    <span className="ico">{recording ? "⏺" : "🎙"}</span>
                    {recording ? "Stop recording" : "Record"}
                  </button>
                  <label className="capture-btn">
                    <span className="ico">📂</span>
                    Upload audio
                    <input
                      type="file"
                      accept="audio/*"
                      hidden
                      onChange={(e) => onUpload(e.target.files?.[0])}
                    />
                  </label>
                  <button type="button" className="capture-btn" onClick={onDemo}>
                    <span className="ico">✨</span>
                    Demo phrase
                  </button>
                </div>
                <div className="meter" aria-hidden>
                  <div style={{ width: `${level}%` }} />
                </div>
                {soundLabel && (
                  <p style={{ margin: "0 0 4px", fontSize: "0.9rem" }}>
                    Loaded: <strong>{soundLabel}</strong>
                  </p>
                )}
                {!samples && (
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                    Tip: 3–10 seconds of sound works best — a spoken name, a giggle, a riff.
                  </p>
                )}
              </div>

              <div className="card" style={{ marginTop: 18 }}>
                <h3>2 · Options</h3>
                <div className="opt-group">
                  <div className="opt-label">Waveform style</div>
                  <div className="chip-row">
                    {WAVEFORM_STYLES.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        className={`chip ${style === w.id ? "selected" : ""}`}
                        onClick={() => setStyle(w.id)}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="opt-group">
                  <div className="opt-label">Garment color</div>
                  <div className="swatches">
                    {GARMENT_COLORS.map((c) => (
                      <button
                        key={c.prodigi}
                        type="button"
                        title={c.label}
                        aria-label={c.label}
                        className={`swatch ${color === c.prodigi ? "selected" : ""}`}
                        style={{ background: c.swatch }}
                        onClick={() => pickColor(c.prodigi)}
                      />
                    ))}
                  </div>
                  <div style={{ marginTop: 6, fontSize: "0.85rem" }}>{garment.label}</div>
                </div>
                <div className="opt-group">
                  <div className="opt-label">Ink color</div>
                  <div className="swatches">
                    {INK_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.label}
                        aria-label={c.label}
                        className={`swatch ${ink === c.hex ? "selected" : ""}`}
                        style={{ background: c.hex, border: "1px solid var(--line)" }}
                        onClick={() => setInk(c.hex)}
                      />
                    ))}
                  </div>
                </div>
                <div className="opt-group" style={{ marginBottom: 0 }}>
                  <div className="opt-label">Size</div>
                  <div className="chip-row">
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={!garment.sizes.includes(s)}
                        className={`chip ${size === s ? "selected" : ""}`}
                        onClick={() => setSize(s)}
                      >
                        {sizeLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card preview-card">
              <h3>3 · Preview &amp; buy</h3>
              <ShirtPreview
                samples={samples}
                style={style}
                ink={ink}
                garment={garment.swatch}
              />
              <div className="price-row">
                <span className="price">${(price / 100).toFixed(2)}</span>
                <span className="price-note">
                  {price > 3600 ? "includes plus-size fabric surcharge" : "free worldwide shipping included"}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary buy-btn"
                disabled={!samples || busy}
                onClick={checkout}
              >
                {!samples
                  ? "Add a sound first"
                  : busy
                    ? "Opening secure checkout…"
                    : "Buy my one-of-one tee"}
              </button>
              {err && <p className="error-note">{err}</p>}
              <p className="fine">
                Secure payment via Stripe. Your shirt is printed and shipped only after your
                payment succeeds.
              </p>
            </div>
          </div>
        </section>

        <section className="faq wrap">
          <h2 className="section-title">Good to know</h2>
          <p className="section-sub">The practical bits.</p>
          <div className="faq-item">
            <h4>How custom is custom?</h4>
            <p>
              Completely. The print is generated from the exact audio you capture — change
              one millisecond of sound and the shape changes. We render it as a
              high-resolution transparent PNG and print it direct-to-garment on Bella +
              Canvas 3001 cotton tees.
            </p>
          </div>
          <div className="faq-item">
            <h4>How long does shipping take, and how much?</h4>
            <p>
              Shipping is free. Orders typically leave the print lab within 2–4 business
              days and are sent with tracked delivery from a lab near you (US, UK, EU, AU
              and more). You&apos;ll see live status and a tracking link on this page after
              checkout.
            </p>
          </div>
          <div className="faq-item">
            <h4>Can I return it?</h4>
            <p>
              Because every shirt is made for one person from one sound, we can&apos;t resell
              returns — so each order is final unless the item arrives misprinted or
              damaged, in which case we reprint or refund. Wash cold, inside out, to keep
              the print crisp.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <p>
            <strong>Echostitch</strong> — a demonstration storefront. Printed on demand via
            the Prodigi global print network; payments processed by Stripe.
          </p>
        </div>
      </footer>
    </>
  );
}
