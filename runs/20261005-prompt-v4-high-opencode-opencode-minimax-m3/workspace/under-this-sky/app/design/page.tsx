"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from "react";

interface Preset {
  name: string;
  lat: number;
  lng: number;
  date: string; // ISO local
  time: string; // HH:MM
  place: string;
}

const PRESETS: Preset[] = [
  {
    name: "Lisbon · 14 Jun 2019 · 23:30",
    place: "Lisbon, Portugal",
    lat: 38.7223,
    lng: -9.1393,
    date: "2019-06-14",
    time: "23:30",
  },
  {
    name: "Porto · 02 Sep 2023 · 04:12",
    place: "Porto, Portugal",
    lat: 41.1502,
    lng: -8.6103,
    date: "2023-09-02",
    time: "04:12",
  },
  {
    name: "Kyoto · 27 May 2018 · 06:02",
    place: "Kyoto, Japan",
    lat: 35.0116,
    lng: 135.7681,
    date: "2018-05-27",
    time: "06:02",
  },
  {
    name: "New York · 04 Jul 2021 · 22:00",
    place: "New York, USA",
    lat: 40.7128,
    lng: -74.006,
    date: "2021-07-04",
    time: "22:00",
  },
  {
    name: "Reykjavík · 21 Dec 2020 · 14:30",
    place: "Reykjavík, Iceland",
    lat: 64.1466,
    lng: -21.9426,
    date: "2020-12-21",
    time: "14:30",
  },
];

const HEADLINE_SUGGESTIONS = [
  "The Night We Met",
  "The Night You Were Born",
  "Our Greatest Adventure",
  "First Light",
  "Always With Me",
  "And So It Was",
];

const PALETTE_CHOICES: Array<{
  id: "ink" | "ivory" | "sage" | "rose";
  label: string;
  bg: string;
  text: string;
}> = [
  { id: "ink", label: "Midnight Ink", bg: "linear-gradient(135deg,#0a1830,#1d2952)", text: "#f4ecd8" },
  { id: "ivory", label: "Antique Ivory", bg: "linear-gradient(135deg,#f4ecd8,#cbb98d)", text: "#241a0c" },
  { id: "rose", label: "Dusty Rose", bg: "linear-gradient(135deg,#f6e0d8,#cb6a76)", text: "#3b0a1a" },
  { id: "sage", label: "Forest Sage", bg: "linear-gradient(135deg,#dfe3c8,#3a5942)", text: "#1c2a18" },
];

const GARMENT_CHOICES: Array<{
  id: "black" | "white" | "navy blue" | "sand" | "natural" | "military green";
  label: string;
  bg: string;
}> = [
  { id: "black", label: "Satin Black", bg: "#101010" },
  { id: "navy blue", label: "Deep Navy", bg: "#13244d" },
  { id: "sand", label: "Desert Sand", bg: "#d8c7a6" },
  { id: "natural", label: "Natural", bg: "#ece1c8" },
  { id: "military green", label: "Mountain Olive", bg: "#4a553a" },
  { id: "white", label: "Optic White", bg: "#f4f0e3" },
];

const SIZE_CHOICES = [
  { id: "xs", label: "XS" },
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
  { id: "xl", label: "XL" },
  { id: "2xl", label: "2XL" },
  { id: "3xl", label: "3XL" },
] as const;

interface PreviewSvgResponse {
  svg?: string;
  error?: string;
}

export default function DesignPage() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [lat, setLat] = useState(PRESETS[0].lat);
  const [lng, setLng] = useState(PRESETS[0].lng);
  const [place, setPlace] = useState(PRESETS[0].place);
  const [dateLocal, setDateLocal] = useState(PRESETS[0].date);
  const [timeLocal, setTimeLocal] = useState(PRESETS[0].time);
  const [headline, setHeadline] = useState(HEADLINE_SUGGESTIONS[0]);
  const [subtitle, setSubtitle] = useState("");
  const [message1, setMessage1] = useState("");
  const [message2, setMessage2] = useState("");
  const [message3, setMessage3] = useState("");
  const [palette, setPalette] = useState<"ink" | "ivory" | "sage" | "rose">("ink");
  const [garment, setGarment] =
    useState<"black" | "white" | "navy blue" | "sand" | "natural" | "military green">("black");
  const [size, setSize] = useState<"xs" | "s" | "m" | "l" | "xl" | "2xl" | "3xl">("m");

  const [recipient, setRecipient] = useState({
    name: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal: "",
    country: "US",
  });

  const [previewSvg, setPreviewSvg] = useState<string>("");
  const [previewError, setPreviewError] = useState<string>("");
  const [checkoutPending, startCheckout] = useTransition();
  const [serverError, setServerError] = useState<string>("");

  // Build the ISO datetime that the server will see (treat local as UTC
  // for simplicity — the user already picked their moment).
  const dateIso = useMemo(() => {
    return `${dateLocal}T${timeLocal.length === 5 ? timeLocal + ":00" : timeLocal}Z`;
  }, [dateLocal, timeLocal]);

  // Debounced preview fetch.
  useEffect(() => {
    const id = setTimeout(() => {
      const url = new URL("/api/preview", window.location.origin);
      url.searchParams.set("dateIso", dateIso);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lng", String(lng));
      url.searchParams.set("placeName", place);
      url.searchParams.set("headline", headline);
      url.searchParams.set("subtitle", subtitle);
      url.searchParams.set("palette", palette);
      const msg = [message1, message2, message3].filter((s) => s.length).join("|");
      if (msg) url.searchParams.set("message", msg);
      fetch(url.toString())
        .then(async (r) => {
          if (!r.ok) {
            const txt = await r.text();
            throw new Error(`preview ${r.status}: ${txt.slice(0, 120)}`);
          }
          const ct = r.headers.get("content-type") ?? "";
          if (ct.includes("image")) {
            const blob = await r.blob();
            const reader = new FileReader();
            reader.onload = () =>
              setPreviewSvg(`<img src='${reader.result}' class='w-full' alt='preview' />`);
            reader.onerror = () =>
              setPreviewSvg(`<div class='text-gold p-4'>Unable to display preview</div>`);
            reader.readAsDataURL(blob);
          } else {
            const data = (await r.json()) as PreviewSvgResponse;
            if (data.error) {
              setPreviewError(data.error);
              setPreviewSvg("");
            } else if (data.svg) {
              setPreviewError("");
              setPreviewSvg(
                data.svg
                  .replace(/xmlns="[^"]*"/, "")
                  .replace(/width="\d+"/, 'width="100%"')
                  .replace(/height="\d+"/, 'height="100%"')
              );
            }
          }
        })
        .catch((e: Error) => {
          setPreviewError(e.message);
          setPreviewSvg("");
        });
    }, 350);
    return () => clearTimeout(id);
  }, [dateIso, lat, lng, place, headline, subtitle, palette, message1, message2, message3]);

  const submit = useCallback(() => {
    setServerError("");
    if (!recipient.name || !recipient.line1 || !recipient.city || !recipient.postal) {
      setServerError("Please fill in a shipping name and address.");
      return;
    }
    startCheckout(async () => {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design: {
            dateIso,
            lat,
            lng,
            placeName: place,
            headline,
            subtitle,
            message: [message1, message2, message3].filter((s) => s.length),
            palette,
            garmentColor: garment,
            garmentSize: size,
            quantity: 1,
          },
          recipient,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setServerError(`Checkout error: ${res.status} ${txt.slice(0, 200)}`);
        return;
      }
      const data = (await res.json()) as { url: string; mode: string };
      window.location.assign(data.url);
    });
  }, [
    dateIso,
    lat,
    lng,
    place,
    headline,
    subtitle,
    message1,
    message2,
    message3,
    palette,
    garment,
    size,
    recipient,
  ]);

  return (
    <main className="min-h-screen bg-inkDeep text-parchment">
      <header className="border-b border-gold/15 py-4">
        <div className="container-narrow flex justify-between items-center">
          <a href="/" className="label-display text-gold text-sm">
            Under&nbsp;·&nbsp;This&nbsp;·&nbsp;Sky
          </a>
          <a href="/" className="text-xs text-parchment/60 uppercase tracking-widest hover:text-gold">
            ← home
          </a>
        </div>
      </header>

      <div className="container-narrow py-10 grid lg:grid-cols-[1.1fr_1fr] gap-10">
        {/* Preview */}
        <section className="order-2 lg:order-1">
          <p className="label-display text-gold text-xs mb-2">Live preview</p>
          <h1 className="h-display text-3xl md:text-4xl mb-2">
            A shirt that has never existed before.
          </h1>
          <p className="text-parchment/70 italic mb-6">
            The preview updates as you type. The print will be made on{" "}
            <span className="text-gold">Gildan 64000 {garment}, {size.toUpperCase()}</span>.
          </p>

          {/* Garment backdrop */}
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-gold/15"
               style={{ background: garmentBg(garment) }}>
            <div className="absolute inset-x-0 top-[6%] bottom-[6%] mx-auto w-[88%] rounded-[14%] shadow-inner"
                 style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="w-[80%] aspect-[0.8]">
                  {previewSvg ? (
                    <div
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: previewSvg }}
                    />
                  ) : previewError ? (
                    <div className="text-rose italic">{previewError}</div>
                  ) : (
                    <div className="text-parchment/40 italic text-center">
                      Designing…
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-parchment/50 text-xs italic text-center">
            Preview is a low-res render. Actual DTG print is a 4665 × 5844 px
            raster on the shirt front.
          </p>
        </section>

        {/* Form */}
        <section className="order-1 lg:order-2 space-y-6">
          <Card title="01 · The moment">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Date (your moment)</label>
                <input
                  type="date"
                  className="field"
                  value={dateLocal}
                  onChange={(e) => setDateLocal(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Time (HH:MM)</label>
                <input
                  type="time"
                  className="field"
                  value={timeLocal}
                  onChange={(e) => setTimeLocal(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="field-label">Quick memories</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(i)}
                    className={`pill hover:border-gold transition ${
                      presetIdx === i ? "bg-gold/20 border-gold text-parchment" : ""
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="field-label">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="field"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="field-label">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="field"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="field-label">Place name (printed on shirt)</label>
              <input
                type="text"
                className="field"
                placeholder="Lisbon, Portugal"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
              />
            </div>
          </Card>

          <Card title="02 · The words">
            <div>
              <label className="field-label">Headline (printed big)</label>
              <input
                type="text"
                className="field"
                maxLength={60}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {HEADLINE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className={`pill hover:border-gold transition ${
                      headline === s ? "bg-gold/20 border-gold text-parchment" : ""
                    }`}
                    onClick={() => setHeadline(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="field-label">Subtitle (printed small)</label>
                <input
                  type="text"
                  className="field"
                  maxLength={60}
                  placeholder="Names, occasion, etc."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              {[
                { val: message1, set: setMessage1, n: "Line 1" },
                { val: message2, set: setMessage2, n: "Line 2" },
                { val: message3, set: setMessage3, n: "Line 3" },
              ].map((m) => (
                <div key={m.n}>
                  <label className="field-label">{m.n} (italic, footer)</label>
                  <input
                    type="text"
                    className="field"
                    maxLength={48}
                    value={m.val}
                    onChange={(e) => m.set(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card title="03 · The look">
            <div>
              <label className="field-label">Palette</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PALETTE_CHOICES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPalette(p.id)}
                    className={`aspect-[3/4] rounded-md border flex items-end justify-center p-2 transition ${
                      palette === p.id ? "ring-2 ring-gold border-gold" : "border-gold/30"
                    }`}
                    style={{ background: p.bg }}
                  >
                    <span
                      className="text-[10px] uppercase tracking-widest"
                      style={{ color: p.text }}
                    >
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="field-label">Shirt color</label>
              <div className="flex flex-wrap gap-2">
                {GARMENT_CHOICES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGarment(g.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
                      garment === g.id
                        ? "border-gold ring-2 ring-gold"
                        : "border-gold/30"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-gold/40"
                      style={{ background: g.bg }}
                    />
                    <span className="text-xs">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="field-label">Size</label>
              <div className="flex flex-wrap gap-2">
                {SIZE_CHOICES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSize(s.id)}
                    className={`px-4 py-1.5 rounded-full border text-xs uppercase tracking-widest ${
                      size === s.id
                        ? "bg-gold/20 border-gold text-parchment"
                        : "border-gold/30 text-parchment/70"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card title="04 · Ship to">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="field-label">Name</label>
                <input
                  className="field"
                  value={recipient.name}
                  onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="field"
                  value={recipient.email}
                  onChange={(e) => setRecipient({ ...recipient, email: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Address line 1</label>
                <input
                  className="field"
                  value={recipient.line1}
                  onChange={(e) => setRecipient({ ...recipient, line1: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Address line 2</label>
                <input
                  className="field"
                  value={recipient.line2}
                  onChange={(e) => setRecipient({ ...recipient, line2: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">City</label>
                <input
                  className="field"
                  value={recipient.city}
                  onChange={(e) => setRecipient({ ...recipient, city: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">State / County</label>
                <input
                  className="field"
                  value={recipient.state}
                  onChange={(e) => setRecipient({ ...recipient, state: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Postal / Zip</label>
                <input
                  className="field"
                  value={recipient.postal}
                  onChange={(e) => setRecipient({ ...recipient, postal: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Country (ISO-2)</label>
                <input
                  className="field uppercase"
                  maxLength={2}
                  value={recipient.country}
                  onChange={(e) =>
                    setRecipient({ ...recipient, country: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>
          </Card>

          <div className="sticky bottom-4 z-10 mt-6 rounded-2xl border border-gold/30 bg-inkDeep/90 backdrop-blur px-5 py-4 shadow-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-widest text-parchment/60">
                  One shirt, unique to your moment — $32
                </p>
                <p className="text-sm text-parchment/70 italic mt-0.5">
                  Shipped worldwide from a Prodigi lab near{" "}
                  <span className="text-gold">{recipient.country || "your address"}</span>.
                </p>
              </div>
              <button
                type="button"
                disabled={checkoutPending}
                onClick={submit}
                className="btn-primary text-base disabled:opacity-50 disabled:pointer-events-none"
              >
                {checkoutPending ? "Preparing…" : "Checkout →"}
              </button>
            </div>
            {serverError && (
              <p className="mt-3 text-sm text-rose">{serverError}</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );

  function applyPreset(i: number): void {
    setPresetIdx(i);
    const p = PRESETS[i];
    setLat(p.lat);
    setLng(p.lng);
    setPlace(p.place);
    setDateLocal(p.date);
    setTimeLocal(p.time);
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gold/15 bg-ink/30 p-5">
      <p className="label-display text-gold text-xs mb-4">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function garmentBg(g: string): string {
  switch (g) {
    case "black":
      return "linear-gradient(135deg,#0c0c0c,#252525)";
    case "navy blue":
      return "linear-gradient(135deg,#0e1c40,#16316d)";
    case "white":
      return "linear-gradient(135deg,#f4f0e3,#e3ddc9)";
    case "natural":
      return "linear-gradient(135deg,#ece1c8,#d6c2a0)";
    case "sand":
      return "linear-gradient(135deg,#e7d8b8,#c9b687)";
    case "military green":
      return "linear-gradient(135deg,#3a4528,#56623c)";
    default:
      return "#000";
  }
}
