"use client";

import { useMemo, useState } from "react";
import {
  ACCENTS,
  autoDefinition,
  autoExample,
  COLORS,
  colorById,
  PARTS_OF_SPEECH,
  SIZES,
  type DesignInput,
  type Size,
} from "@/lib/design";
import { buildMockupSvg } from "@/lib/artwork-svg";

const SAMPLE_WORDS = ["Mara", "Dev", "Oma", "Felix", "Priya", "Theo", "Nadia", "Grandpa Joe"];
const SHIRT_PRICE = 34;
const SHIPPING = 4.95;

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function Customizer({ cancelled }: { cancelled: boolean }) {
  const [word, setWord] = useState("Mara");
  const [pos, setPos] = useState<string>("noun");
  const [size, setSize] = useState<Size>("m");
  const [colorId, setColorId] = useState("black");
  const [accentId, setAccentId] = useState("gold");
  const [year, setYear] = useState("");
  const [defOverride, setDefOverride] = useState<string | null>(null);
  const [exOverride, setExOverride] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(cancelled ? "Checkout cancelled - you can pick up where you left off." : null);

  const cleanWord = word.trim().replace(/\s+/g, " ");
  const wordValid = /^[A-Za-z][A-Za-z' -]{0,15}$/.test(cleanWord);

  const definition =
    defOverride !== null ? defOverride : cleanWord ? autoDefinition(cleanWord) : "";
  const example =
    exOverride !== null ? exOverride : cleanWord ? autoExample(cleanWord) : "";

  const design: DesignInput = useMemo(
    () => ({
      word: wordValid ? cleanWord : "Mara",
      pos,
      definition: definition || autoDefinition("Mara"),
      example: example || autoExample("Mara"),
      year: year ? Number(year) : null,
      size,
      color: colorId,
      accent: accentId,
    }),
    [wordValid, cleanWord, pos, definition, example, year, size, colorId, accentId]
  );

  const mockup = useMemo(() => buildMockupSvg(design), [design]);
  const color = colorById(colorId);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(design),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-start">
      {/* Preview */}
      <div className="lg:sticky lg:top-8">
        <div className="relative mx-auto max-w-md rounded-2xl border border-[#1d1a15]/10 bg-white p-6 shadow-[0_18px_50px_-20px_rgba(29,26,21,0.35)]">
          <div
            className="mx-auto"
            dangerouslySetInnerHTML={{ __html: mockup }}
          />
          <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-[#1d1a15]/50">
            Live preview - Bella + Canvas 3001 - {color.label}
          </p>
        </div>
        <dl className="mx-auto mt-6 max-w-md rounded-xl bg-[#1d1a15] p-5 text-[#f2ead8]">
          <dt className="font-serif text-2xl">
            {design.word}
            <span className="text-[#f2ead8]/60">, {design.pos}.</span>
          </dt>
          <dd className="mt-2 text-sm leading-relaxed text-[#f2ead8]/85">
            {design.definition}
          </dd>
          <dd className="mt-2 font-serif italic text-[#f2ead8]/70">{design.example}</dd>
        </dl>
      </div>

      {/* Controls */}
      <div className="space-y-7">
        <section>
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d1a15]/60">
            Who is this shirt about?
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={word}
              onChange={(e) => {
                setWord(e.target.value.replace(/[^A-Za-z'’ \-]/g, "").slice(0, 16));
                setDefOverride(null);
                setExOverride(null);
              }}
              placeholder="A name or word, e.g. Mara"
              className="w-full rounded-lg border border-[#1d1a15]/25 bg-white px-4 py-3 font-serif text-xl"
            />
            <button
              type="button"
              onClick={() => {
                const next =
                  SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)];
                setWord(next);
                setDefOverride(null);
                setExOverride(null);
              }}
              title="Try a random name"
              className="shrink-0 rounded-lg border border-[#1d1a15]/25 bg-white px-3 text-xs font-semibold uppercase tracking-wide hover:bg-[#1d1a15]/5"
            >
              Shuffle
            </button>
          </div>
          {!wordValid && (
            <p className="mt-1 text-xs text-red-700">
              1-16 letters (spaces, hyphens, apostrophes ok).
            </p>
          )}
        </section>

        <section>
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d1a15]/60">
            They are a...
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PARTS_OF_SPEECH.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPos(p)}
                className={`rounded-full border px-4 py-1.5 text-sm capitalize ${
                  pos === p
                    ? "border-[#1d1a15] bg-[#1d1a15] text-[#f2ead8]"
                    : "border-[#1d1a15]/25 bg-white hover:border-[#1d1a15]/60"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d1a15]/60">
              Definition
            </label>
            {(defOverride !== null || exOverride !== null) && (
              <button
                type="button"
                className="text-xs underline underline-offset-2"
                onClick={() => {
                  setDefOverride(null);
                  setExOverride(null);
                }}
              >
                back to auto-written
              </button>
            )}
          </div>
          <textarea
            value={definition}
            maxLength={190}
            rows={3}
            onChange={(e) => setDefOverride(e.target.value)}
            className="mt-2 w-full rounded-lg border border-[#1d1a15]/25 bg-white px-4 py-3 text-sm leading-relaxed"
          />
          <textarea
            value={example}
            maxLength={130}
            rows={2}
            onChange={(e) => setExOverride(e.target.value)}
            placeholder="Example sentence"
            className="mt-2 w-full rounded-lg border border-[#1d1a15]/25 bg-white px-4 py-3 font-serif text-sm italic"
          />
          <div className="mt-2 flex items-center gap-3">
            <label className="text-xs text-[#1d1a15]/60">est.</label>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              placeholder={String(new Date().getFullYear())}
              inputMode="numeric"
              className="w-28 rounded-lg border border-[#1d1a15]/25 bg-white px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-[#1d1a15]/50">
              birth year, founding year, whatever fits
            </span>
          </div>
        </section>

        <section>
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d1a15]/60">
            Size
          </label>
          <div className="mt-2 grid grid-cols-8 gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`rounded-md border py-2 text-xs font-semibold uppercase ${
                  size === s
                    ? "border-[#1d1a15] bg-[#1d1a15] text-[#f2ead8]"
                    : "border-[#1d1a15]/25 bg-white hover:border-[#1d1a15]/60"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d1a15]/60">
            Shirt colour
          </label>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                onClick={() => setColorId(c.id)}
                className={`swatch-ring h-9 w-9 rounded-full border ${
                  colorId === c.id
                    ? "ring-2 ring-[#1d1a15] ring-offset-2 ring-offset-[#f4f1ea]"
                    : "border-[#1d1a15]/20"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-[#1d1a15]/50">{color.label}</p>
        </section>

        <section>
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d1a15]/60">
            Accent colour
          </label>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                title={a.label}
                onClick={() => setAccentId(a.id)}
                className={`swatch-ring h-9 w-9 rounded-full border ${
                  accentId === a.id
                    ? "ring-2 ring-[#1d1a15] ring-offset-2 ring-offset-[#f4f1ea]"
                    : "border-[#1d1a15]/20"
                }`}
                style={{ backgroundColor: a.hex }}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#1d1a15]/15 bg-white p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[#1d1a15]/70">
              1 x custom definition tee ({size.toUpperCase()}, {color.label})
            </span>
            <span className="font-serif text-xl">{formatMoney(SHIRT_PRICE)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between text-sm text-[#1d1a15]/70">
            <span>Standard tracked shipping, worldwide</span>
            <span>{formatMoney(SHIPPING)}</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-[#1d1a15]/20 pt-3">
            <span className="font-semibold">Total at checkout</span>
            <span className="font-serif text-2xl">
              {formatMoney(SHIRT_PRICE + SHIPPING)}
            </span>
          </div>
          <button
            type="button"
            disabled={!wordValid || busy}
            onClick={checkout}
            className="mt-4 w-full rounded-lg bg-[#1d1a15] py-3.5 font-semibold text-[#f2ead8] transition hover:bg-[#3a332a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Opening secure checkout..." : `Buy "${design.word}" - ${formatMoney(SHIRT_PRICE + SHIPPING)}`}
          </button>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          <p className="mt-3 text-xs leading-relaxed text-[#1d1a15]/50">
            Printed direct-to-garment in full colour after you pay, then shipped
            to your door. Cards via Stripe (test mode in this demo).
          </p>
        </section>
      </div>
    </div>
  );
}
