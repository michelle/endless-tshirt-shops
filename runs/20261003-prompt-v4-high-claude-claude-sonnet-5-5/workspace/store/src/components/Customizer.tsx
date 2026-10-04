"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { INKS, PRICE_CENTS, SHIRT_COLORS, SIZES, SIZE_LABEL, inksFor, money, MAX_QTY_PER_ITEM, type Size } from "@/lib/catalog";
import { LIMITS, cleanText, designFromParam, designToParam, parseDesign, type Design } from "@/lib/design";
import { DEFAULT_DESIGN } from "@/lib/presets";
import { addToCart } from "@/lib/cart";

type Hit = { name: string; region: string; country: string; cc: string; lat: number; lon: number; tz: string };

export function Customizer() {
  const router = useRouter();
  const sp = useSearchParams();
  const initial = useMemo(() => designFromParam(sp.get("d")) ?? DEFAULT_DESIGN, [sp]);

  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time || "21:00");
  const [noTime, setNoTime] = useState(!initial.time);
  const [place, setPlace] = useState(initial.place);
  const [placeText, setPlaceText] = useState(`${initial.place.name}${initial.place.cc ? ", " + new Intl.DisplayNames(["en"], { type: "region" }).of(initial.place.cc) : ""}`);
  const [caption, setCaption] = useState(initial.caption);
  const [shirt, setShirt] = useState(initial.shirt);
  const [ink, setInk] = useState(initial.ink);
  const [lines, setLines] = useState(initial.lines);
  const [size, setSize] = useState<Size>("m");
  const [qty, setQty] = useState(1);

  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [imgLoading, setImgLoading] = useState(true);

  const inks = inksFor(shirt);
  useEffect(() => {
    if (!inks.some((i) => i.id === ink)) setInk(inks[0]?.id ?? INKS[0].id);
  }, [shirt]); // eslint-disable-line react-hooks/exhaustive-deps

  const design: Design | null = useMemo(
    () => parseDesign({ title, date, time: noTime ? "" : time, place, caption, shirt, ink, lines }),
    [title, date, time, noTime, place, caption, shirt, ink, lines],
  );
  const param = design ? designToParam(design) : null;

  // Debounced preview URL so we don't render on every keystroke.
  const [previewParam, setPreviewParam] = useState(param);
  useEffect(() => {
    if (!param) return;
    const t = setTimeout(() => setPreviewParam(param), 250);
    return () => clearTimeout(t);
  }, [param]);
  useEffect(() => { setImgLoading(true); }, [previewParam]);

  // Place autocomplete
  const reqId = useRef(0);
  useEffect(() => {
    if (!open || placeText.trim().length < 2) { setHits([]); return; }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(placeText)}`);
        const j = await r.json();
        if (id === reqId.current) { setHits(j.results); setActive(0); }
      } catch {}
    }, 180);
    return () => clearTimeout(t);
  }, [placeText, open]);

  const pick = (h: Hit) => {
    setPlace({ name: h.name, cc: h.cc, lat: h.lat, lon: h.lon, tz: h.tz });
    setPlaceText(`${h.name}, ${h.country}`);
    setOpen(false);
  };

  const add = () => {
    setError("");
    if (!design) { setError("Please check the date and choose a place from the list."); return; }
    addToCart({ design, size, qty });
    router.push("/cart");
  };

  const shirtMeta = SHIRT_COLORS.find((s) => s.id === shirt)!;

  return (
    <div className="designer">
      <div className="preview">
        <div className={`stage ${imgLoading ? "loading" : ""}`}>
          {previewParam && (
            <img
              src={`/api/mockup?bg=1&d=${previewParam}`}
              alt={`Preview of your ${shirtMeta.label} tee`}
              onLoad={() => setImgLoading(false)}
              onError={() => setImgLoading(false)}
            />
          )}
        </div>
        <p className="note">
          Preview of your design on a {shirtMeta.label.toLowerCase()} tee. The shirt is printed from a high-resolution file of this artwork.
        </p>
      </div>

      <div className="form">
        <div>
          <div className="eyebrow">Your moment</div>
          <h1 style={{ fontSize: "2.4rem" }}>Design your tee</h1>
        </div>

        <div className="field">
          <label htmlFor="title">Headline</label>
          <input id="title" type="text" value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(cleanText(e.target.value.replace(/^\s+/, ""), LIMITS.title) )} placeholder="The night we met" />
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" min="1900-01-01" max="2100-12-31" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="time">Local time</label>
            <input id="time" type="time" value={time} disabled={noTime} onChange={(e) => setTime(e.target.value)} />
            <label className="check" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: ".9rem" }}>
              <input type="checkbox" checked={noTime} onChange={(e) => setNoTime(e.target.checked)} /> I don&rsquo;t know the time
            </label>
          </div>
        </div>

        <div className="field combo">
          <label htmlFor="place">Place</label>
          <input
            id="place" type="search" autoComplete="off" value={placeText} placeholder="Search a city, e.g. Lisbon"
            onChange={(e) => { setPlaceText(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (!open || !hits.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); pick(hits[active]); }
              if (e.key === "Escape") setOpen(false);
            }}
            role="combobox" aria-expanded={open && hits.length > 0} aria-controls="place-list"
          />
          {open && hits.length > 0 && (
            <ul id="place-list" role="listbox">
              {hits.map((h, i) => (
                <li key={`${h.name}-${h.lat}-${h.lon}`} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); pick(h); }}>
                  {h.name} <small>{[h.region, h.country].filter(Boolean).join(", ")}</small>
                </li>
              ))}
            </ul>
          )}
          <div className="hint">Showing the sky over {place.name} ({Math.abs(place.lat).toFixed(2)}°{place.lat >= 0 ? "N" : "S"}, {Math.abs(place.lon).toFixed(2)}°{place.lon >= 0 ? "E" : "W"}).</div>
        </div>

        <div className="field">
          <label htmlFor="caption">Personal line <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
          <input id="caption" type="text" value={caption} maxLength={LIMITS.caption} onChange={(e) => setCaption(cleanText(e.target.value.replace(/^\s+/, ""), LIMITS.caption))} placeholder="Mia & Jonas" />
        </div>

        <div className="field">
          <div className="lab">Shirt colour: {shirtMeta.label}</div>
          <div className="swatches">
            {SHIRT_COLORS.map((c) => (
              <button key={c.id} type="button" className="sw" style={{ background: c.hex }} aria-pressed={shirt === c.id} aria-label={c.label} title={c.label} onClick={() => setShirt(c.id)} />
            ))}
          </div>
        </div>

        <div className="field">
          <div className="lab">Ink</div>
          <div className="swatches">
            {inks.map((i) => (
              <button key={i.id} type="button" className="ink" aria-pressed={ink === i.id} onClick={() => setInk(i.id)}>
                <i style={{ background: `linear-gradient(135deg, ${i.main} 50%, ${i.accent} 50%)` }} /> {i.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="check" style={{ margin: 0, textTransform: "none", letterSpacing: 0, fontSize: "1rem" }}>
            <input type="checkbox" checked={lines} onChange={(e) => setLines(e.target.checked)} /> Draw constellation lines
          </label>
        </div>

        <div className="buy">
          <div className="field">
            <div className="lab">Size</div>
            <div className="pills">
              {SIZES.map((s) => (
                <button key={s} type="button" className="pill" aria-pressed={size === s} onClick={() => setSize(s)}>{SIZE_LABEL[s]}</button>
              ))}
            </div>
            <div className="hint">Unisex fit. Chest (flat, in): S 18, M 20, L 22, XL 24, 2XL 26, 3XL 28.</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer">−</button>
              <span aria-live="polite">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(MAX_QTY_PER_ITEM, q + 1))} aria-label="More">+</button>
            </div>
            <div className="price"><b>{money(PRICE_CENTS * qty)}</b></div>
          </div>
          {error && <div className="err" role="alert">{error}</div>}
          <button className="btn block" onClick={add} disabled={!design}>Add to cart</button>
          <div className="hint" style={{ textAlign: "center" }}>Shipping is calculated in your cart. Made to order, so allow 5–10 business days.</div>
        </div>
      </div>
    </div>
  );
}
