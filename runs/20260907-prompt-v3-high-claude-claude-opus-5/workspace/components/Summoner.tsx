"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  APPETITE_SUGGESTIONS,
  CryptidSpec,
  LIMITS,
  TEMPERAMENTS,
  TemperamentId,
  normalizeSpec,
} from "@/lib/spec";
import { generateCryptid } from "@/lib/genome";
import { renderPlate } from "@/lib/art/plate";
import { COLORS, SIZES, formatUsd, priceCents, colorById } from "@/lib/catalog";
import { TeeMockup } from "./TeeMockup";

function hourLabel(h: number) {
  const suffix = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:00 ${suffix}`;
}

export function Summoner() {
  const [keeper, setKeeper] = useState("");
  const [place, setPlace] = useState("");
  const [hour, setHour] = useState(3);
  const [appetite, setAppetite] = useState("");
  const [temperament, setTemperament] = useState<TemperamentId>("mischievous");
  const [twist, setTwist] = useState(0);
  const [colorId, setColorId] = useState("black");
  const [sizeId, setSizeId] = useState("l");
  const [view, setView] = useState<"tee" | "plate">("tee");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = keeper.trim().length > 0 && place.trim().length > 0 && appetite.trim().length > 0;

  const rawSpec: Partial<CryptidSpec> = { keeper, place, hour, appetite, temperament, twist };
  const deferred = useDeferredValue(JSON.stringify(rawSpec));

  const { cryptid, spec } = useMemo(() => {
    const s = normalizeSpec(JSON.parse(deferred) as Partial<CryptidSpec>);
    return { cryptid: generateCryptid(s), spec: s };
  }, [deferred]);

  const color = colorById(colorId)!;
  const plate = useMemo(
    () => renderPlate(cryptid, color.ink, `live-${color.ink}`),
    [cryptid, color.ink]
  );

  const amount = priceCents(sizeId);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, garment: { color: colorId, size: sizeId } }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout could not be started");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="builder">
      <div>
        <div className="field">
          <label htmlFor="keeper">1 — Who is doing the documenting?</label>
          <input
            id="keeper"
            type="text"
            value={keeper}
            maxLength={LIMITS.keeper}
            placeholder="Your name"
            onChange={(e) => setKeeper(e.target.value)}
          />
          <p className="hint">Goes on the plate, and into the creature&apos;s Latin name.</p>
        </div>

        <div className="field">
          <label htmlFor="place">2 — Where does it turn up?</label>
          <input
            id="place"
            type="text"
            value={place}
            maxLength={LIMITS.place}
            placeholder="Your town, street, or kitchen"
            onChange={(e) => setPlace(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="field-label">3 — What hour does it stir?</span>
          <div className="hourwrap">
            <input
              type="range"
              min={0}
              max={23}
              value={hour}
              aria-label="Hour it stirs"
              onChange={(e) => setHour(Number(e.target.value))}
            />
            <span className="hourval">{hourLabel(hour)}</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="appetite">4 — What does it feed on?</label>
          <input
            id="appetite"
            type="text"
            value={appetite}
            maxLength={LIMITS.appetite}
            placeholder="Be specific. Be unflattering."
            onChange={(e) => setAppetite(e.target.value)}
          />
          <div className="chips">
            {APPETITE_SUGGESTIONS.slice(0, 6).map((s) => (
              <button key={s} type="button" className="chip" onClick={() => setAppetite(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">5 — Its temperament</span>
          <div className="temperaments">
            {TEMPERAMENTS.map((t) => (
              <button
                key={t.id}
                type="button"
                className="temp"
                aria-pressed={temperament === t.id}
                onClick={() => setTemperament(t.id)}
              >
                <strong>{t.label}</strong>
                <span>{t.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <hr className="rule" />

        <div className="field" style={{ marginTop: 26 }}>
          <span className="field-label">Garment colour — {color.label}</span>
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="swatch"
                style={{ background: c.hex }}
                aria-label={c.label}
                title={c.label}
                aria-pressed={colorId === c.id}
                onClick={() => setColorId(c.id)}
              />
            ))}
          </div>
          <p className="hint">
            The ink flips to bone or coal so the plate reads on whatever you pick.
          </p>
        </div>

        <div className="field">
          <span className="field-label">Size</span>
          <div className="sizes">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="size"
                aria-pressed={sizeId === s.id}
                onClick={() => setSizeId(s.id)}
              >
                {s.label}
                {s.surchargeCents > 0 ? ` +${formatUsd(s.surchargeCents)}` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="buybar">
          <div className="pricerow">
            <span className="price">{formatUsd(amount)}</span>
            <span className="price-note">Free worldwide shipping · printed to order</span>
          </div>
          <button className="btn block lg" onClick={buy} disabled={!ready || busy}>
            {busy ? "Opening checkout…" : ready ? "Print this creature" : "Answer all five to continue"}
          </button>
          {error && <p className="err">{error}</p>}
        </div>
      </div>

      <div className="stage">
        <div className="viewtabs" role="group" aria-label="Preview mode">
          <button type="button" aria-pressed={view === "tee"} onClick={() => setView("tee")}>
            On the shirt
          </button>
          <button type="button" aria-pressed={view === "plate"} onClick={() => setView("plate")}>
            The plate, up close
          </button>
        </div>
        {view === "tee" ? (
          <div className="tee-frame">
            <TeeMockup
              garmentHex={color.hex}
              plate={plate}
              label={`${cryptid.commonName} on a ${color.label} t-shirt`}
            />
          </div>
        ) : (
          <div className="plate-view" style={{ background: color.hex }}>
            <svg
              viewBox="0 0 1200 1600"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label={`${cryptid.commonName} field guide plate`}
              dangerouslySetInnerHTML={{ __html: plate }}
            />
          </div>
        )}
        <div className="stage-actions">
          <button
            className="btn ghost block"
            type="button"
            onClick={() => setTwist((t) => (t + 1) % 1000)}
          >
            Not quite it — summon again
          </button>
        </div>
        <div className="namecard">
          <h3>{cryptid.commonName.toUpperCase()}</h3>
          <p>
            {cryptid.binomial} · plate no. {cryptid.plateNo}
          </p>
        </div>
        <div className="stage-meta">
          <span>{cryptid.genome.palette.name} palette</span>
          <span>Specimen {cryptid.specimenId}</span>
        </div>
      </div>
    </div>
  );
}
