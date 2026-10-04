"use client";

import { useRef, useState } from "react";
import {
  COLORS,
  SIZES,
  STYLES,
  BASE_PRICE_USD,
  colorById,
  styleById,
  type ColorId,
  type SizeId,
  type StyleId,
} from "@/lib/config";

export default function Customizer() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [style, setStyle] = useState<StyleId>("watercolor");
  const [color, setColor] = useState<ColorId>("black");
  const [size, setSize] = useState<SizeId>("m");
  const [petName, setPetName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const colorInfo = colorById(color);
  const styleInfo = styleById(style);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const checkout = async () => {
    if (!photo) {
      setError("Upload a photo of your pet first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 1. Upload the photo to get a public URL for printing.
      const file = fileRef.current?.files?.[0];
      let imageUrl: string;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upJson = await up.json();
        if (!up.ok) throw new Error(upJson.error || "Upload failed");
        imageUrl = upJson.url;
      } else {
        throw new Error("Photo file is missing");
      }

      // 2. Create a Stripe Checkout session.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, style, color, size, petName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");

      // 3. Redirect to Stripe.
      window.location.href = json.url;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Preview */}
      <div className="flex flex-col items-center">
        <div
          className="relative flex aspect-[4/5] w-full max-w-sm items-center justify-center rounded-3xl p-8 shadow-inner transition-colors"
          style={{ backgroundColor: colorInfo.hex }}
        >
          <ShirtPreview />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-56 w-44 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-white/40 bg-white/10 backdrop-blur-sm">
              {photo ? (
                <img
                  src={photo}
                  alt="Your pet"
                  className="h-full w-full object-cover"
                  style={{ filter: styleInfo.filter }}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-white/80">
                  <PawIcon className="h-10 w-10" />
                  <span className="text-xs font-medium">Your pet's portrait appears here</span>
                </div>
              )}
            </div>
          </div>
          {petName && (
            <div className="absolute bottom-16 text-center font-serif text-lg italic text-white/90">
              {petName}
            </div>
          )}
        </div>
        <p className="mt-3 text-sm text-stone-500">
          {styleInfo.label} · {colorInfo.label} · {size.toUpperCase()}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            1 · Upload a photo
          </h2>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="block w-full cursor-pointer rounded-xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-600 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-stone-700"
          />
          <p className="mt-1 text-xs text-stone-400">
            A clear, well-lit photo works best. JPG, PNG or WebP up to 10 MB.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            2 · Choose a style
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  style === s.id
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            3 · Shirt color
          </h2>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                title={c.label}
                aria-label={c.label}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  color === c.id ? "border-stone-900 ring-2 ring-stone-900/20" : "border-stone-200"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            4 · Size
          </h2>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSize(s.id)}
                className={`min-w-12 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  size === s.id
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            5 · Pet's name <span className="font-normal normal-case text-stone-400">(optional)</span>
          </h2>
          <input
            type="text"
            value={petName}
            maxLength={40}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="e.g. Biscuit"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-400"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={checkout}
          disabled={busy || !photo}
          className="mt-2 w-full rounded-xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Preparing checkout…" : `Checkout — $${BASE_PRICE_USD.toFixed(2)}`}
        </button>
        <p className="text-center text-xs text-stone-400">
          Secure payment via Stripe. Printed &amp; shipped on demand with DTG.
        </p>
      </div>
    </div>
  );
}

function ShirtPreview() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full opacity-20" aria-hidden>
      <path
        d="M60 40 L80 30 L100 38 L120 30 L140 40 L150 60 L160 80 L160 170 L40 170 L40 80 L50 60 Z"
        fill="#ffffff"
      />
    </svg>
  );
}

function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <ellipse cx="6" cy="9" rx="2" ry="2.6" />
      <ellipse cx="12" cy="7" rx="2" ry="2.6" />
      <ellipse cx="18" cy="9" rx="2" ry="2.6" />
      <ellipse cx="4.5" cy="13.5" rx="1.6" ry="2.2" />
      <ellipse cx="19.5" cy="13.5" rx="1.6" ry="2.2" />
      <path d="M12 11c2.6 0 4.6 2 4.6 4.4 0 1.6-1.2 2.6-2.6 2.6-1 0-1.6-.5-2-.5s-1 .5-2 .5c-1.4 0-2.6-1-2.6-2.6C7.4 13 9.4 11 12 11z" />
    </svg>
  );
}
