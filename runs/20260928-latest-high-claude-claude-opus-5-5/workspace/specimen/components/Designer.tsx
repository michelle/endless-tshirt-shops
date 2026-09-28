"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DESIGN,
  Design,
  KINDS,
  LIMITS,
  STATUSES,
  TRAITS,
  decodeDesignParam,
  epithetFor,
  genusSuggestions,
  randomSeed,
  validateDesign,
} from "@/lib/design";
import { PALETTE_INFO } from "@/lib/specimen";
import { SHIRT_COLORS, SIZES, formatUsd, sizeById } from "@/lib/catalog";
import { Specimen } from "./Specimen";
import { useCart } from "./cart-store";

const DRAFT_KEY = "specimen.draft.v1";

export function Designer({ from }: { from?: string }) {
  const [d, setD] = useState<Design>(DEFAULT_DESIGN);
  const [genusTouched, setGenusTouched] = useState(false);
  const [view, setView] = useState<"shirt" | "plate">("shirt");
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cart = useCart();

  // Start from a gallery example, a saved draft, or the default with a fresh random seed.
  useEffect(() => {
    let start: Design | null = null;
    if (from) {
      try {
        start = { ...decodeDesignParam(from), seed: randomSeed() };
        setGenusTouched(true);
      } catch {}
    }
    if (!start) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          start = { ...DEFAULT_DESIGN, ...JSON.parse(saved) };
          setGenusTouched(true);
        }
      } catch {}
    }
    setD(start ?? { ...DEFAULT_DESIGN, seed: randomSeed() });
  }, [from]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  }, [d]);

  const set = <K extends keyof Design>(k: K, v: Design[K]) => {
    setAdded(false);
    setD((prev) => ({ ...prev, [k]: v }));
  };

  const suggestions = useMemo(() => genusSuggestions(d.name), [d.name]);
  const onName = (name: string) => {
    setAdded(false);
    setD((prev) => ({ ...prev, name, genus: genusTouched ? prev.genus : genusSuggestions(name)[0] }));
  };
  const setMark = (i: number, v: string) => {
    const marks = [...d.marks] as Design["marks"];
    marks[i] = v;
    set("marks", marks);
  };

  const price = sizeById(d.size)?.priceCents ?? 0;
  const latin = `${d.genus || "…"} ${epithetFor(d.genus, d.trait)}`;

  const addToBag = () => {
    setError(null);
    try {
      const clean = validateDesign(d);
      if (!cart.add(clean)) {
        setError("Your bag is full (10 designs max per order).");
        return;
      }
      setAdded(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="wrap designer">
      <div>
        <div className="label">New specimen</div>
        <h1>Describe your specimen</h1>
        <p className="intro">Everything you type appears on the plate. Leave a field blank and we&apos;ll improvise.</p>

        <div className="panel">
          <h2>
            The subject <small>who is this shirt about?</small>
          </h2>
          <div className="row2">
            <label className="field">
              <span>
                Name <em>{d.name.length}/{LIMITS.name}</em>
              </span>
              <input value={d.name} maxLength={LIMITS.name} onChange={(e) => onName(e.target.value)} placeholder="e.g. Maria, Biscuit" />
            </label>
            <label className="field">
              <span>First recorded (year)</span>
              <input
                value={d.year}
                inputMode="numeric"
                maxLength={4}
                onChange={(e) => set("year", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="1994"
              />
            </label>
          </div>
          <label className="field">
            <span>Defining trait</span>
            <select value={d.trait} onChange={(e) => set("trait", e.target.value as Design["trait"])}>
              {TRAITS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.id})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Genus (Latin name) <em>{d.genus.length}/{LIMITS.genus}</em>
            </span>
            <input
              value={d.genus}
              maxLength={LIMITS.genus}
              onChange={(e) => {
                setGenusTouched(true);
                set("genus", e.target.value.replace(/[^A-Za-z]/g, ""));
              }}
            />
            <div className="chips">
              {suggestions.map((g) => (
                <button
                  type="button"
                  key={g}
                  className="chip"
                  aria-pressed={g === d.genus}
                  onClick={() => {
                    setGenusTouched(true);
                    set("genus", g);
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="panel">
          <h2>
            Field notes <small>short and specific is funniest</small>
          </h2>
          <label className="field">
            <span>
              Natural habitat <em>{d.habitat.length}/{LIMITS.habitat}</em>
            </span>
            <input value={d.habitat} maxLength={LIMITS.habitat} onChange={(e) => set("habitat", e.target.value)} placeholder="Kitchen, near the snacks" />
          </label>
          <label className="field">
            <span>
              Diet <em>{d.diet.length}/{LIMITS.diet}</em>
            </span>
            <input value={d.diet} maxLength={LIMITS.diet} onChange={(e) => set("diet", e.target.value)} placeholder="Iced coffee & gossip" />
          </label>
          <label className="field">
            <span>
              Call (a catchphrase) <em>{d.call.length}/{LIMITS.call}</em>
            </span>
            <input value={d.call} maxLength={LIMITS.call} onChange={(e) => set("call", e.target.value)} placeholder="Wait, what?" />
          </label>
        </div>

        <div className="panel">
          <h2>
            Distinguishing marks <small>numbered on the specimen</small>
          </h2>
          {[0, 1, 2].map((i) => (
            <label className="field" key={i}>
              <span>
                Mark {i + 1} <em>{d.marks[i].length}/{LIMITS.mark}</em>
              </span>
              <input value={d.marks[i]} maxLength={LIMITS.mark} onChange={(e) => setMark(i, e.target.value)} />
            </label>
          ))}
        </div>

        <div className="panel">
          <h2>Conservation status</h2>
          <div className="status-pills">
            {STATUSES.map((s) => (
              <button type="button" key={s.id} aria-pressed={d.status === s.id} onClick={() => set("status", s.id)}>
                <b>{s.id}</b>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>
            The creature <small>variant #{d.seed.toString(36).toUpperCase()}</small>
          </h2>
          <div className="field">
            <span>Order</span>
            <div className="seg">
              {KINDS.map((k) => (
                <button type="button" key={k.id} aria-pressed={d.kind === k.id} onClick={() => set("kind", k.id)}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Coloration</span>
            <div className="swatches">
              {PALETTE_INFO.map((p) => (
                <button type="button" key={p.id} className="swatch" aria-pressed={d.palette === p.id} onClick={() => set("palette", p.id)}>
                  <span className="dots">
                    {p.swatch.map((c, i) => (
                      <i key={i} style={{ background: c }} />
                    ))}
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn ghost small" onClick={() => set("seed", randomSeed())}>
            ↻ Mutate: discover another one
          </button>
        </div>

        <div className="panel">
          <h2>The shirt</h2>
          <div className="field">
            <span>Color</span>
            <div className="swatches">
              {SHIRT_COLORS.map((c) => (
                <button type="button" key={c.id} className="swatch" aria-pressed={d.color === c.id} onClick={() => set("color", c.id)}>
                  <span className="color-dot" style={{ background: c.hex }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Size (unisex fit)</span>
            <select value={d.size} onChange={(e) => set("size", e.target.value)}>
              {SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} · {formatUsd(s.priceCents)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="preview-col">
        <div className="preview">
          <div className="preview-bar">
            <span className="label">Live preview</span>
            <div className="seg" style={{ width: 220 }}>
              <button type="button" aria-pressed={view === "shirt"} onClick={() => setView("shirt")}>
                On shirt
              </button>
              <button type="button" aria-pressed={view === "plate"} onClick={() => setView("plate")}>
                Print file
              </button>
            </div>
          </div>
          <Specimen design={d} view={view} className={view === "plate" ? "preview-plate" : undefined} />
        </div>
        <div className="buybox">
          <div className="row">
            <div>
              <div style={{ fontStyle: "italic", fontSize: 22, lineHeight: 1.2 }}>{latin}</div>
              <div className="note">
                {SHIRT_COLORS.find((c) => c.id === d.color)?.label} · {sizeById(d.size)?.label} · 1 of 1
              </div>
            </div>
            <div className="price">{formatUsd(price)}</div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={addToBag} disabled={!d.name.trim()}>
              Add to bag
            </button>
            <button type="button" className="btn ghost" onClick={() => set("seed", randomSeed())}>
              ↻ Mutate
            </button>
          </div>
          {added && (
            <div className="toast">
              <span>Specimen added to your bag.</span>
              <a className="btn small" href="/cart">
                View bag ({cart.count}) →
              </a>
            </div>
          )}
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </div>
  );
}
