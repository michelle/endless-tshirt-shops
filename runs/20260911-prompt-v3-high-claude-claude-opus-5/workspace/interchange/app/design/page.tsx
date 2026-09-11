"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Foot, Nav } from "@/components/Chrome";
import { Tee } from "@/components/Tee";
import { SAMPLES } from "@/lib/samples";
import { SHIPPING, ShippingOptionId, money, totals, BACK_PRINT_CENTS } from "@/lib/pricing";
import {
  GARMENTS, GARMENT_ORDER, LIMITS, MAX_LINES, MAX_STATIONS, MIN_STATIONS,
  PALETTE, SHIRT_SIZES, SIZE_LABELS, ShirtSize, Spec, specProblem,
} from "@/lib/spec";

const STORAGE_KEY = "interchange.design.v1";

const clone = (s: Spec): Spec => JSON.parse(JSON.stringify(s));

export default function Design() {
  const [spec, setSpec] = useState<Spec>(() => clone(SAMPLES[0].spec));
  const [side, setSide] = useState<"front" | "back">("front");
  const [qty, setQty] = useState(1);
  const [shipping, setShipping] = useState<ShippingOptionId>("standard");
  const [svg, setSvg] = useState<string>("");
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const seq = useRef(0);

  // Restore a design in progress.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSpec(JSON.parse(saved));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(spec)); } catch { /* ignore */ }
  }, [spec, loaded]);

  useEffect(() => {
    if (!spec.backPrint && side === "back") setSide("front");
  }, [spec.backPrint, side]);

  // Preview comes from the same renderer that produces the print file.
  useEffect(() => {
    const id = ++seq.current;
    setRendering(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ spec, side }),
        });
        const text = await res.text();
        if (seq.current === id) { setSvg(text); setRendering(false); }
      } catch {
        if (seq.current === id) setRendering(false);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [spec, side]);

  const edit = useCallback((fn: (draft: Spec) => void) => {
    setSpec((prev) => { const next = clone(prev); fn(next); return next; });
  }, []);

  const t = useMemo(() => totals(spec, qty, shipping), [spec, qty, shipping]);
  const problem = specProblem(spec);
  const stopCount = spec.lines.reduce((n, l) => n + l.stations.length, 0);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spec, qty, shipping }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout.");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  const usedColors = new Set(spec.lines.map((l) => l.color));

  return (
    <>
      <Nav />
      <div className="wrap-wide">
        <div className="designer">
          {/* ------------------------------------------------------ preview */}
          <div className="stage">
            <div className="stage-bar">
              <div className="chips">
                <button className="chip" aria-pressed={side === "front"} onClick={() => setSide("front")}>Front</button>
                {spec.backPrint && (
                  <button className="chip" aria-pressed={side === "back"} onClick={() => setSide("back")}>Back</button>
                )}
              </div>
              <span className="muted">
                {rendering ? "drawing…" : `${spec.lines.length} lines · ${stopCount} stops`}
              </span>
            </div>
            <div className="stage-tee" style={{ opacity: rendering && !svg ? 0.35 : 1, transition: "opacity .2s" }}>
              <Tee color={GARMENTS[spec.garment].hex}>
                <div dangerouslySetInnerHTML={{ __html: svg }} />
              </Tee>
            </div>
            <p className="muted" style={{ textAlign: "center", marginTop: 6 }}>
              Preview is the actual print file, drawn at the same moment you are.
            </p>
          </div>

          {/* ------------------------------------------------------ controls */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Design your map</p>
            <h2 style={{ marginBottom: 18 }}>What are your lines called?</h2>

            <div className="panel">
              <header><h3>Start from</h3></header>
              <div className="body">
                <div className="chips">
                  {SAMPLES.map((s) => (
                    <button key={s.id} className="chip" onClick={() => setSpec(clone(s.spec))}>{s.name}</button>
                  ))}
                  <button
                    className="chip"
                    onClick={() =>
                      setSpec({
                        v: 1, title: "MY NETWORK", subtitle: "", motto: "", garment: "black",
                        size: "l", variant: 0, backPrint: false,
                        lines: [{ name: "Line One", color: PALETTE[0].hex, stations: [
                          { label: "First stop" }, { label: "Second stop" }, { label: "Third stop" },
                        ]}],
                      })
                    }
                  >
                    Blank map
                  </button>
                </div>
              </div>
            </div>

            <div className="panel">
              <header><h3>Title block</h3></header>
              <div className="body">
                <label className="field">
                  <span>Title</span>
                  <input type="text" value={spec.title} maxLength={LIMITS.title}
                    placeholder="THE ROSA NETWORK"
                    onChange={(e) => edit((d) => { d.title = e.target.value; })} />
                </label>
                <label className="field">
                  <span>Subtitle</span>
                  <input type="text" value={spec.subtitle} maxLength={LIMITS.subtitle}
                    placeholder="SERVICE MAP 1991 - PRESENT"
                    onChange={(e) => edit((d) => { d.subtitle = e.target.value; })} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span>Footer note</span>
                  <input type="text" value={spec.motto} maxLength={LIMITS.motto}
                    placeholder="mind the gap"
                    onChange={(e) => edit((d) => { d.motto = e.target.value; })} />
                </label>
              </div>
            </div>

            <div className="panel">
              <header>
                <h3>Lines &amp; stops</h3>
                <button className="btn sm ghost" disabled={spec.lines.length >= MAX_LINES}
                  onClick={() => edit((d) => {
                    const color = PALETTE.find((p) => !usedColors.has(p.hex))?.hex || PALETTE[d.lines.length % PALETTE.length].hex;
                    d.lines.push({ name: `Line ${d.lines.length + 1}`, color, stations: [{ label: "First stop" }, { label: "Second stop" }] });
                  })}>
                  Add line
                </button>
              </header>
              <div className="body">
                {spec.lines.map((line, li) => (
                  <div className="lineblock" key={li}>
                    <div className="top">
                      <span className="dot" style={{ background: line.color }} />
                      <input type="text" value={line.name} maxLength={LIMITS.lineName}
                        onChange={(e) => edit((d) => { d.lines[li].name = e.target.value; })} />
                      <button className="iconbtn" title="Remove line" disabled={spec.lines.length <= 1}
                        onClick={() => edit((d) => { d.lines.splice(li, 1); })}>&times;</button>
                    </div>

                    <div className="swatches" style={{ marginBottom: 12 }}>
                      {PALETTE.map((p) => (
                        <button key={p.id} className="swatch" title={p.name}
                          style={{ background: p.hex }} aria-pressed={line.color === p.hex}
                          onClick={() => edit((d) => { d.lines[li].color = p.hex; })} />
                      ))}
                    </div>

                    {line.stations.map((st, si) => (
                      <div className="stop" key={si}>
                        <input className="lbl" type="text" value={st.label} maxLength={LIMITS.station}
                          placeholder="Stop name"
                          onChange={(e) => edit((d) => { d.lines[li].stations[si].label = e.target.value; })} />
                        <input className="note" type="text" value={st.note ?? ""} maxLength={LIMITS.note}
                          placeholder="year"
                          onChange={(e) => edit((d) => { d.lines[li].stations[si].note = e.target.value || undefined; })} />
                        <button className="iconbtn" title="Mark as a major interchange"
                          aria-pressed={!!st.major}
                          onClick={() => edit((d) => { d.lines[li].stations[si].major = !d.lines[li].stations[si].major; })}>
                          &#9678;
                        </button>
                        <button className="iconbtn" title="Remove stop"
                          disabled={line.stations.length <= MIN_STATIONS}
                          onClick={() => edit((d) => { d.lines[li].stations.splice(si, 1); })}>&times;</button>
                      </div>
                    ))}
                    <button className="btn sm ghost" style={{ marginTop: 6 }}
                      disabled={line.stations.length >= MAX_STATIONS}
                      onClick={() => edit((d) => { d.lines[li].stations.push({ label: "New stop" }); })}>
                      Add stop
                    </button>
                  </div>
                ))}
                <p className="muted" style={{ marginTop: 4 }}>
                  Tip: type the same stop name on two lines and the map draws an interchange where
                  they meet.
                </p>
              </div>
            </div>

            <div className="panel">
              <header>
                <h3>Layout</h3>
                <button className="btn sm ghost"
                  onClick={() => edit((d) => { d.variant = (((d.variant + 1) % 4) as Spec["variant"]); })}>
                  Shuffle routes
                </button>
              </header>
              <div className="body">
                <div className="chips">
                  {[0, 1, 2, 3].map((v) => (
                    <button key={v} className="chip" aria-pressed={spec.variant === v}
                      onClick={() => edit((d) => { d.variant = v as Spec["variant"]; })}>
                      Network {v + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel">
              <header><h3>The shirt</h3></header>
              <div className="body">
                <label className="field">
                  <span>Colour &mdash; {GARMENTS[spec.garment].label}</span>
                  <div className="swatches">
                    {GARMENT_ORDER.map((g) => (
                      <button key={g} className="swatch" title={GARMENTS[g].label}
                        style={{ background: GARMENTS[g].hex }} aria-pressed={spec.garment === g}
                        onClick={() => edit((d) => { d.garment = g; })} />
                    ))}
                  </div>
                </label>
                <label className="field">
                  <span>Size</span>
                  <div className="chips">
                    {SHIRT_SIZES.map((s) => (
                      <button key={s} className="chip" aria-pressed={spec.size === s}
                        onClick={() => edit((d) => { d.size = s as ShirtSize; })}>
                        {SIZE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span>Back print</span>
                  <div className="chips">
                    <button className="chip" aria-pressed={!spec.backPrint}
                      onClick={() => edit((d) => { d.backPrint = false; })}>Front only</button>
                    <button className="chip" aria-pressed={spec.backPrint}
                      onClick={() => edit((d) => { d.backPrint = true; })}>
                      Add service index (+{money(BACK_PRINT_CENTS)})
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="panel">
              <header><h3>Delivery</h3></header>
              <div className="body">
                <div className="row2">
                  <label className="field">
                    <span>Quantity</span>
                    <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5].map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Shipping</span>
                    <select value={shipping} onChange={(e) => setShipping(e.target.value as ShippingOptionId)}>
                      {Object.values(SHIPPING).map((s) => (
                        <option key={s.id} value={s.id}>{s.label} &mdash; {money(s.cents)}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="muted" style={{ margin: 0 }}>{SHIPPING[shipping].detail}. Address is collected at payment.</p>
              </div>
            </div>

            <div className="sticky-buy">
              <table className="summary">
                <tbody>
                  <tr>
                    <td>{t.qty} &times; custom tee{spec.backPrint ? " (front + back)" : ""}</td>
                    <td>{money(t.subtotal)}</td>
                  </tr>
                  <tr><td>{SHIPPING[shipping].label} shipping</td><td>{money(t.shipping)}</td></tr>
                  <tr className="total"><td>Total</td><td>{money(t.total)}</td></tr>
                </tbody>
              </table>
              {problem && <p className="notice" style={{ marginTop: 12 }}>{problem}</p>}
              {error && <p className="notice err" style={{ marginTop: 12 }}>{error}</p>}
              <button className="btn accent block" style={{ marginTop: 14 }}
                disabled={busy || !!problem} onClick={checkout}>
                {busy ? <><span className="spin" /> Starting checkout&hellip;</> : `Pay ${money(t.total)} and print it`}
              </button>
              <p className="muted" style={{ textAlign: "center", marginTop: 10, marginBottom: 0 }}>
                Nothing is sent to the press until payment clears.
              </p>
            </div>

            <p className="muted" style={{ marginTop: 20 }}>
              Changed your mind about everything? <Link href="/">Back to the front page</Link>.
            </p>
          </div>
        </div>
      </div>
      <Foot />
    </>
  );
}
