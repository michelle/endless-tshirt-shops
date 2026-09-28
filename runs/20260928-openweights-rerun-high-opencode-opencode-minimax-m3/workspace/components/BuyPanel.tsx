"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRICE_CENTS,
  SHIRT_COLORS,
  SHIRT_SIZES,
  type ShirtColor,
  type ShirtSize,
} from "@/lib/design";

interface Props {
  sky: {
    date: string;
    lat: number;
    lon: number;
    place?: string;
    title: string;
  };
  initialColor: ShirtColor;
  initialSize: ShirtSize;
}

const PRICE_LABEL = `$${(PRICE_CENTS / 100).toFixed(2)} USD`;

export default function BuyPanel({ sky, initialColor, initialSize }: Props) {
  const router = useRouter();
  const [color, setColor] = useState<ShirtColor>(initialColor);
  const [size, setSize] = useState<ShirtSize>(initialSize);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live preview is the same SVG endpoint the homepage uses, so what you
  // see here is what gets printed.
  const previewParams = new URLSearchParams({
    date: sky.date,
    lat: sky.lat.toFixed(2),
    lon: sky.lon.toFixed(2),
    title: sky.title,
  });
  if (sky.place) previewParams.set("place", sky.place);

  const buy = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: sky.date,
          lat: sky.lat,
          lon: sky.lon,
          place: sky.place ?? "",
          title: sky.title,
          shirt: { color, size },
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.url) {
        throw new Error(data?.error || `Checkout failed (HTTP ${resp.status})`);
      }
      router.push(data.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "checkout failed";
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <p className="kicker">Step 3 · Order</p>
      <h2 className="hero" style={{ fontSize: "1.5rem", margin: "6px 0 12px" }}>
        Print my sky.
      </h2>

      <div className="row" style={{ gap: 24 }}>
        <div style={{ flex: 1 }}>
          <label>Colour</label>
          <div className="swatch-row">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={color === c.value}
                aria-label={c.label}
                title={c.label}
                onClick={() => setColor(c.value)}
              >
                <span style={{ background: c.hex }} />
              </button>
            ))}
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-dim)", marginTop: 8 }}>
            {SHIRT_COLORS.find((c) => c.value === color)?.label}
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="size">Size</label>
          <select
            id="size"
            value={size}
            className="select"
            onChange={(e) => setSize(e.target.value as ShirtSize)}
          >
            {SHIRT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <hr className="divider" />

      <dl className="meta">
        <dt>Title</dt>
        <dd>{sky.title}</dd>
        <dt>Date</dt>
        <dd>{sky.date}</dd>
        <dt>Place</dt>
        <dd>{sky.place ?? `${sky.lat.toFixed(2)}°, ${sky.lon.toFixed(2)}°`}</dd>
        <dt>Shirt</dt>
        <dd>
          {SHIRT_COLORS.find((c) => c.value === color)?.label}, {size.toUpperCase()}
        </dd>
      </dl>

      <p style={{ marginTop: 18, fontSize: "1.05rem" }}>
        <strong style={{ color: "var(--accent-strong)" }}>{PRICE_LABEL}</strong>{" "}
        <span style={{ color: "var(--ink-soft)" }}>· includes worldwide shipping</span>
      </p>
      <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem", marginTop: 4 }}>
        Stripe collects payment and the shipping address. We&rsquo;ll only submit your order
        to the printer after payment clears.
      </p>

      {error && (
        <p className="banner err" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: 18 }}>
        <button
          className="button"
          disabled={submitting}
          onClick={buy}
        >
          {submitting ? "Opening checkout…" : `Buy for ${PRICE_LABEL} →`}
        </button>
      </div>
    </div>
  );
}
