"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { SHIRT_COLORS, SHIRT_SIZES, type ShirtColor, type ShirtSize } from "@/lib/design";

interface FormState {
  date: string;
  lat: string;
  lon: string;
  place: string;
  title: string;
  color: ShirtColor;
  size: ShirtSize;
}

const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_FORM: FormState = {
  date: "2018-09-04",
  lat: "40.7128",
  lon: "-74.0060",
  place: "New York, NY",
  title: "The night we met",
  color: "black",
  size: "m",
};

function toUrl(state: FormState): string {
  const params = new URLSearchParams({
    date: state.date,
    lat: state.lat,
    lon: state.lon,
    title: state.title,
    color: state.color,
    size: state.size,
  });
  if (state.place.trim()) params.set("place", state.place);
  return `/preview?${params.toString()}`;
}

export default function DesignForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Live preview URL - this keeps the preview SVG in sync as the customer
  // types, but only re-renders after they stop changing things for ~250ms.
  const previewQuery = useMemo(() => {
    const params = new URLSearchParams({
      date: form.date,
      lat: form.lat,
      lon: form.lon,
      title: form.title,
    });
    if (form.place.trim()) params.set("place", form.place);
    return `/api/preview-svg?${params.toString()}`;
  }, [form.date, form.lat, form.lon, form.title, form.place]);

  const [debouncedSrc, setDebouncedSrc] = useState(previewQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSrc(previewQuery), 250);
    return () => clearTimeout(t);
  }, [previewQuery]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    router.push(toUrl(form));
  };

  return (
    <div className="row" style={{ alignItems: "flex-start", gap: 32 }}>
      <form onSubmit={submit} className="col" style={{ flex: "1 1 320px", maxWidth: 520 }}>
        <div>
          <p className="kicker">Step 1</p>
          <h2 className="hero" style={{ fontSize: "1.7rem", margin: "8px 0 0" }}>
            Pick your moment.
          </h2>
          <p style={{ color: "var(--ink-soft)", marginTop: 8 }}>
            A wedding. A first kiss. The night the cicadas came out. Whatever day made you go
            &ldquo;remember this.&rdquo;
          </p>
        </div>

        <div>
          <label htmlFor="date">The date</label>
          <input
            id="date"
            className="input"
            type="date"
            max={TODAY}
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            required
          />
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label htmlFor="lat">Latitude</label>
            <input
              id="lat"
              className="input"
              type="number"
              step="0.01"
              min="-90"
              max="90"
              value={form.lat}
              onChange={(e) => update("lat", e.target.value)}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="lon">Longitude</label>
            <input
              id="lon"
              className="input"
              type="number"
              step="0.01"
              min="-180"
              max="180"
              value={form.lon}
              onChange={(e) => update("lon", e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="place">Place (optional)</label>
          <input
            id="place"
            className="input"
            type="text"
            placeholder="New York, NY"
            value={form.place}
            onChange={(e) => update("place", e.target.value)}
            maxLength={80}
          />
          <p style={{ fontSize: "0.85rem", color: "var(--ink-dim)", marginTop: 6 }}>
            We&rsquo;ll print this under the date if you fill it in. Leave blank for the raw
            coordinates.
          </p>
        </div>

        <div>
          <label htmlFor="title">Your title</label>
          <input
            id="title"
            className="input"
            type="text"
            placeholder="the night we met"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            maxLength={60}
            required
          />
          <p style={{ fontSize: "0.85rem", color: "var(--ink-dim)", marginTop: 6 }}>
            This goes in big serif type across the top of the shirt.
          </p>
        </div>

        <hr className="divider" />

        <div>
          <p className="kicker">Step 2</p>
          <h2 className="hero" style={{ fontSize: "1.5rem", margin: "8px 0 0" }}>
            Pick your shirt.
          </h2>
        </div>

        <div>
          <label>Colour</label>
          <div className="swatch-row">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.label}
                aria-pressed={form.color === c.value}
                title={c.label}
                onClick={() => update("color", c.value)}
              >
                <span style={{ background: c.hex }} />
              </button>
            ))}
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-dim)", marginTop: 8 }}>
            Currently: <strong style={{ color: "var(--ink)" }}>
              {SHIRT_COLORS.find((c) => c.value === form.color)?.label}
            </strong>
          </p>
        </div>

        <div>
          <label htmlFor="size">Size</label>
          <select
            id="size"
            className="select"
            value={form.size}
            onChange={(e) => update("size", e.target.value as ShirtSize)}
          >
            {SHIRT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <button type="submit" className="button" disabled={submitting}>
            See your sky →
          </button>
        </div>
      </form>

      <div className="col" style={{ flex: "1 1 280px", minWidth: 280 }}>
        <p className="kicker" style={{ textAlign: "center" }}>Live preview</p>
        <div className="preview-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={debouncedSrc}
            alt="Live preview of your personal design"
            key={debouncedSrc}
          />
        </div>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
          The shirt print is generated from the same recipe and is identical to this preview.
        </p>
      </div>
    </div>
  );
}
