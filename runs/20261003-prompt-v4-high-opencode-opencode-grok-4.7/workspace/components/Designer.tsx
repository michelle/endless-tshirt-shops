"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shirt } from "./Shirt";
import { SHIRTS, SIZES, STORIES, type DesignSpec } from "@/lib/catalog";
import { formatCoord, placeLabel } from "@/lib/design";

type Hit = {
  name: string;
  admin1: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  label: string;
};

const STORAGE = "stillpoint.design";

export function Designer() {
  const router = useRouter();
  const [spec, setSpec] = useState<DesignSpec>(STORIES[0]);
  const [query, setQuery] = useState(placeLabel(STORIES[0].place, STORIES[0].region));
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"shirt" | "print">("shirt");
  const [story, setStory] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setHits(data.results || []);
    }, 220);
    return () => clearTimeout(handle);
  }, [query]);

  const shirt = SHIRTS.find((s) => s.id === spec.color) ?? SHIRTS[0];
  const ready = spec.name1.trim().length > 1 && Number.isFinite(spec.lat) && spec.place.length > 1;

  const blurb = useMemo(() => {
    if (!spec.place) return "Choose a place to chart the sky.";
    return `${placeLabel(spec.place, spec.region)} · ${formatCoord(spec.lat, spec.lon)}`;
  }, [spec]);

  function patch(partial: Partial<DesignSpec>) {
    setStory(-1);
    setSpec((current) => ({ ...current, ...partial }));
  }

  function loadStory(index: number) {
    const next = STORIES[index];
    setStory(index);
    setSpec(next);
    setQuery(placeLabel(next.place, next.region));
    setOpen(false);
    setError("");
  }

  function choosePlace(hit: Hit) {
    setSpec((current) => ({
      ...current,
      place: hit.name,
      region: hit.admin1,
      lat: hit.latitude,
      lon: hit.longitude,
      tz: hit.timezone,
    }));
    setQuery(hit.label);
    setOpen(false);
    setStory(-1);
  }

  function continueToShip() {
    if (!ready) {
      setError("Add a name and choose a place from the list.");
      return;
    }
    sessionStorage.setItem(STORAGE, JSON.stringify(spec));
    router.push("/checkout");
  }

  return (
    <>
      <div className="studio">
        <div className="stage-wrap">
          <div className="stage">
            {mode === "shirt" ? <Shirt spec={spec} mode="shirt" /> : <Shirt spec={spec} mode="print" />}
            <div className="stage-tools">
              <span>{shirt.name} · {shirt.note}</span>
              <span>
                <button type="button" aria-pressed={mode === "shirt"} onClick={() => setMode("shirt")}>On the shirt</button>{" "}
                <button type="button" aria-pressed={mode === "print"} onClick={() => setMode("print")}>Print file</button>
              </span>
            </div>
          </div>
        </div>

        <div>
          <p className="eyebrow">Direct to garment · made when you order</p>
          <h1>The sky from the hour you kept.</h1>
          <p className="lede">
            A date, a place, and who was there. We chart the stars that were actually overhead, then print them on a soft cotton tee — a chest print, not a poster, so the shirt still looks like a shirt.
          </p>
          <div className="price-line">
            <b>$48</b>
            <span>Gildan Softstyle, unisex. Shipping calculated for your country before you pay.</span>
          </div>

          <p className="kicker"><em>01</em> When</p>
          <div className="grid-2">
            <label className="field">
              Date
              <input type="date" value={spec.date} min="1920-01-01" max="2099-12-31" onChange={(e) => patch({ date: e.target.value })} />
            </label>
            <label className="field">
              Time
              <input type="time" value={spec.time} disabled={spec.approximate} onChange={(e) => patch({ time: e.target.value })} />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={spec.approximate} onChange={(e) => patch({ approximate: e.target.checked, time: e.target.checked ? "22:00" : spec.time })} />
            I don’t remember the hour — chart 10:00 pm and print “Evening”.
          </label>

          <p className="kicker"><em>02</em> Where</p>
          <div className="place-wrap">
            <label className="field">
              Place
              <input
                value={query}
                placeholder="Brooklyn, Lisbon, a town you still think about"
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                  patch({ place: "", lat: Number.NaN, lon: Number.NaN });
                }}
                onFocus={() => setOpen(true)}
              />
            </label>
            {open && hits.length > 0 && (
              <ul className="suggest">
                {hits.map((hit) => (
                  <li key={`${hit.label}-${hit.latitude}`}>
                    <button type="button" onClick={() => choosePlace(hit)}>{hit.label}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="locked">{blurb}</p>

          <p className="kicker"><em>03</em> Who</p>
          <div className="names">
            <label className="field">
              Name
              <input value={spec.name1} maxLength={18} onChange={(e) => patch({ name1: e.target.value })} placeholder="June" />
            </label>
            <span className="amp">&</span>
            <label className="field">
              And, if there were two
              <input value={spec.name2} maxLength={18} onChange={(e) => patch({ name2: e.target.value })} placeholder="Marco" />
            </label>
          </div>

          <p className="kicker"><em>04</em> One line</p>
          <label className="field">
            Only you would write this
            <input value={spec.line} maxLength={48} onChange={(e) => patch({ line: e.target.value })} placeholder="the rain stopped on Smith Street" />
            <span className="hint">{spec.line.length}/48 · printed in italic under the date. Leave it blank if the sky is enough.</span>
          </label>

          <p className="kicker"><em>05</em> The shirt</p>
          <div className="swatches" role="list">
            {SHIRTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="swatch"
                aria-label={item.name}
                aria-pressed={spec.color === item.id}
                title={`${item.name} · ${item.note}`}
                style={{ background: item.hex }}
                onClick={() => patch({ color: item.id })}
              />
            ))}
          </div>
          <p className="meta">{shirt.name}. {shirt.note}. Ink is chosen so it reads on this cotton.</p>
          <div className="sizes" style={{ marginTop: 12 }}>
            {SIZES.map((size) => (
              <button key={size.id} type="button" className="size" aria-pressed={spec.size === size.id} onClick={() => patch({ size: size.id })}>
                {size.label}
              </button>
            ))}
          </div>
          <p className="meta">Body width, laid flat: {SIZES.find((s) => s.id === spec.size)?.body}" · unisex Softstyle.</p>

          {error && <p className="error">{error}</p>}
          <button className="primary" type="button" onClick={continueToShip}>Continue to shipping</button>

          <p className="kicker"><em>Or</em> start from a kept hour</p>
          <div className="stories">
            {STORIES.map((item, index) => (
              <button key={item.kicker} type="button" className="story" aria-pressed={story === index} onClick={() => loadStory(index)}>
                <strong>{item.kicker}</strong>
                <span>{item.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="below">
        <div className="steps">
          <article>
            <b>01</b>
            <div>
              <h2>Name the hour</h2>
              <p>A birthday, a wedding night, the evening someone arrived. The chart is calculated for that date, that clock time, and that latitude — not a generic star field.</p>
            </div>
          </article>
          <article>
            <b>02</b>
            <div>
              <h2>We set the type</h2>
              <p>Names in a condensed serif, the date and coordinates in small tracked capitals, and your line in italic. The cotton shows through. Nothing is printed edge to edge.</p>
            </div>
          </article>
          <article>
            <b>03</b>
            <div>
              <h2>Printed after you pay</h2>
              <p>Stripe confirms the charge. Only then do we send the print file to Prodigi, who print it direct to garment and ship it. If payment doesn’t succeed, nothing is sent.</p>
            </div>
          </article>
        </div>
        <aside className="cloth">
          <h2>The cloth</h2>
          <p>Unisex Gildan Softstyle 64000. Ring-spun cotton, about 4.5 oz, crew neck. Direct to garment, not a heat transfer.</p>
          <ul>
            <li>Chest print, transparent ground, so the shirt color is the background.</li>
            <li>Light shirts print in ink and copper. Dark shirts print in warm ivory.</li>
            <li>Ships from the Prodigi lab nearest the address you give.</li>
          </ul>
        </aside>
      </section>
    </>
  );
}
