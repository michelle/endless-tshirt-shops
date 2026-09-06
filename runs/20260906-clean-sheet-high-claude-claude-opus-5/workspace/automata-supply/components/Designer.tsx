"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShirtMockup } from "./ShirtMockup";
import { useCart } from "./CartContext";
import { artUrl } from "@/lib/art";
import { formatUsd, priceFor } from "@/lib/catalog";
import {
  GARMENTS,
  INKS,
  MAX_CELLS,
  MIN_CELLS,
  SIZES,
  clampCells,
  designTitle,
  inkFitsGarment,
  inksForGarment,
  normalizeSeed,
  randomSeed,
  type Design,
  type InkId,
  type SizeId,
  type Seeding,
} from "@/lib/design";
import { evolve, density } from "@/lib/ca";

/**
 * Rules whose evolution is empty, solid, or a plain checkerboard. They are
 * valid automata but they make a blank or vibrating shirt, so the designer
 * flags them rather than letting someone buy a mistake.
 */
function critique(design: Design): string | null {
  const rows = evolve(design.rule, design.cells, design.cells, design.seed, design.seeding);
  const d = density(rows);
  if (d < 0.015) return "This combination dies out almost immediately — nearly nothing to print.";
  if (d > 0.93) return "This combination fills in solid. It will print as a heavy ink block.";
  return null;
}

export function Designer({ initial }: { initial: Design }) {
  const router = useRouter();
  const cart = useCart();

  const [rule, setRule] = useState(initial.rule);
  const [seed, setSeed] = useState(initial.seed);
  const [seedInput, setSeedInput] = useState(initial.seed);
  const [seeding, setSeeding] = useState<Seeding>(initial.seeding);
  const [cells, setCells] = useState(initial.cells);
  const [ink, setInk] = useState<InkId>(initial.ink);
  const [garmentId, setGarmentId] = useState("black");
  const [size, setSize] = useState<SizeId>("m");
  const [added, setAdded] = useState(false);

  const design: Design = useMemo(
    () => ({ rule, seed, seeding, cells, ink }),
    [rule, seed, seeding, cells, ink],
  );

  const warning = useMemo(() => critique(design), [design]);
  const price = priceFor(design, size);
  const availableInks = useMemo(() => inksForGarment(garmentId), [garmentId]);

  // Keep the address bar in sync so a design can be bookmarked or shared.
  useEffect(() => {
    const qs = new URLSearchParams({
      rule: String(rule),
      seed,
      seeding,
      ink,
      cells: String(cells),
    });
    window.history.replaceState(null, "", `/design?${qs}`);
  }, [rule, seed, seeding, ink, cells]);

  const touch = useCallback(() => setAdded(false), []);

  function pickGarment(next: string) {
    setGarmentId(next);
    touch();
    if (!inkFitsGarment(ink, next)) setInk(inksForGarment(next)[0].id);
  }

  function roll() {
    setRule(Math.floor(Math.random() * 256));
    const s = randomSeed();
    setSeed(s);
    setSeedInput(s);
    setSeeding(Math.random() < 0.35 ? "single" : "random");
    touch();
  }

  function commitSeed(raw: string) {
    const next = normalizeSeed(raw);
    setSeed(next);
    setSeedInput(next);
    touch();
  }

  return (
    <div className="designer">
      <div className="product-stage">
        <ShirtMockup
          artUrl={artUrl(design, 900)}
          garmentId={garmentId}
          alt={`Custom ${designTitle(design)} shirt preview`}
        />
      </div>

      <div>
        <p className="eyebrow">One of one</p>
        <h1 className="product-title" style={{ fontSize: 34 }}>
          Design your own
        </h1>
        <p className="product-note">
          Pick a rule and a seed. We evolve it, render it at print resolution and
          put it on a shirt. Nobody else gets this one unless they type the same
          two numbers.
        </p>

        <div className="field">
          <div className="field-label">
            <span>Rule</span>
            <b className="mono">
              {rule} / {rule.toString(2).padStart(8, "0")}
            </b>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={rule}
            onChange={(e) => {
              setRule(Number(e.target.value));
              touch();
            }}
          />
        </div>

        <div className="field">
          <div className="field-label">
            <span>Initial row</span>
          </div>
          <div className="chips" style={{ marginBottom: 10 }}>
            <button
              type="button"
              className="chip"
              aria-pressed={seeding === "single"}
              onClick={() => {
                setSeeding("single");
                touch();
              }}
            >
              Single cell
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={seeding === "random"}
              onClick={() => {
                setSeeding("random");
                touch();
              }}
            >
              Seeded random
            </button>
          </div>
          {seeding === "random" ? (
            <div className="row">
              <input
                className="text-input"
                value={seedInput}
                maxLength={6}
                spellCheck={false}
                aria-label="Seed, six hexadecimal characters"
                onChange={(e) => setSeedInput(e.target.value.toUpperCase())}
                onBlur={(e) => commitSeed(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitSeed((e.target as HTMLInputElement).value);
                }}
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => commitSeed(randomSeed())}
              >
                New
              </button>
            </div>
          ) : (
            <p className="cart-meta" style={{ margin: 0 }}>
              One live cell in the middle of an empty row — the classic setup.
            </p>
          )}
        </div>

        <div className="field">
          <div className="field-label">
            <span>Lattice</span>
            <b className="mono">
              {cells} &times; {cells}
            </b>
          </div>
          <input
            type="range"
            min={MIN_CELLS}
            max={MAX_CELLS}
            step={2}
            value={cells}
            onChange={(e) => {
              setCells(clampCells(Number(e.target.value)));
              touch();
            }}
          />
        </div>

        <div className="field">
          <div className="field-label">
            <span>Garment</span>
            <b>{GARMENTS.find((g) => g.id === garmentId)?.name}</b>
          </div>
          <div className="swatches">
            {GARMENTS.map((g) => (
              <button
                key={g.id}
                type="button"
                className="swatch"
                style={{ background: g.hex }}
                aria-pressed={g.id === garmentId}
                aria-label={g.name}
                title={g.name}
                onClick={() => pickGarment(g.id)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">
            <span>Ink</span>
            <b>{INKS[ink].name}</b>
          </div>
          <div className="chips">
            {availableInks.map((i) => (
              <button
                key={i.id}
                type="button"
                className="chip"
                aria-pressed={i.id === ink}
                onClick={() => {
                  setInk(i.id);
                  touch();
                }}
              >
                {i.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">
            <span>Size</span>
            <b>{SIZES.find((s) => s.id === size)?.label}</b>
          </div>
          <div className="chips">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip"
                aria-pressed={s.id === size}
                onClick={() => {
                  setSize(s.id);
                  touch();
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {warning ? (
          <p className="notice" style={{ borderColor: "#7a5a1e", color: "var(--warn)" }}>
            {warning}
          </p>
        ) : null}

        <div className="row" style={{ marginTop: 24 }}>
          <button type="button" className="btn" onClick={roll}>
            Randomise
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              cart.add({ design, size, garmentId, qty: 1, name: designTitle(design) });
              setAdded(true);
            }}
          >
            {added ? "Added ✓" : `Add to cart — ${formatUsd(price)}`}
          </button>
          {added ? (
            <button type="button" className="btn" onClick={() => router.push("/cart")}>
              Checkout
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
