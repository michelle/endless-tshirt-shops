"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { SkyPreview } from "@/components/SkyPreview";
import { toDesignDateISO } from "@/lib/stripeClient";
import {
  COLORS,
  COUNTRIES,
  SHIPPING_FLAT_CENTS,
  SIZES,
  STYLES,
  type ColorKey,
  type SizeKey,
  type StyleKey,
} from "@/lib/catalog";

type GeoResult = { name: string; admin1?: string; country?: string; lat: number; lon: number; label: string };

function formatUSD(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function defaultDateLocal() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
}

export function DesignForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  // Left empty on first render (and filled in via effect after mount) so
  // the server-prerendered HTML — built at a different instant than any
  // given page load — can't disagree with the client and trip a hydration
  // mismatch on `new Date()`.
  const [dateLocal, setDateLocal] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoOpen, setGeoOpen] = useState(false);
  const [location, setLocation] = useState<GeoResult | null>(null);
  const [caption, setCaption] = useState("");

  const [style, setStyle] = useState<StyleKey>("classic");
  const [color, setColor] = useState<ColorKey>("black");
  const [size, setSize] = useState<SizeKey>("m");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("US");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDateLocal(defaultDateLocal());
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (locationQuery.trim().length < 2) {
      setGeoResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(locationQuery)}`);
        const data = await res.json();
        setGeoResults(data.results ?? []);
        setGeoOpen(true);
      } catch {
        setGeoResults([]);
      }
    }, 300);
  }, [locationQuery]);

  const dateISO = useMemo(() => toDesignDateISO(dateLocal), [dateLocal]);
  const previewInput = useMemo(
    () => ({
      dateISO: dateISO || "2024-01-01T00:00:00Z",
      lat: location?.lat ?? 40.6782,
      lon: location?.lon ?? -73.9442,
      locationLabel: location?.label ?? "Somewhere, out there",
      caption,
    }),
    [dateISO, location, caption]
  );

  const subtotal = STYLES[style].priceCents;
  const shipping = SHIPPING_FLAT_CENTS;
  const total = subtotal + shipping;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!location) {
      setError("Please choose a location from the search results.");
      return;
    }
    if (!dateISO) {
      setError("Please choose a date and time.");
      return;
    }
    if (!name || !email || !line1 || !city || !postal || !country) {
      setError("Please fill in all required shipping fields.");
      return;
    }
    if (!stripe || !elements) {
      setError("Payment form is still loading — try again in a moment.");
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Payment form failed to load.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style,
          color,
          size,
          skyDateISO: dateISO,
          skyLat: location.lat,
          skyLon: location.lon,
          skyLocation: location.label,
          skyCaption: caption,
          shipping: { name, email, phone, line1, line2, city, state, postal, country },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong creating your order.");
        setSubmitting(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        { payment_method: { card: cardElement, billing_details: { name, email } } }
      );

      if (confirmError) {
        setError(confirmError.message ?? "Your card was declined.");
        setSubmitting(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        router.push(`/order/${paymentIntent.id}`);
        return;
      }

      setError(`Payment status: ${paymentIntent?.status}. Please try again.`);
      setSubmitting(false);
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[1fr_420px] gap-12">
      <form onSubmit={handleSubmit} className="space-y-10">
        <section>
          <h2 className="text-sm uppercase tracking-[0.2em] text-white/50 mb-4">1. Your moment</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-white/70">Date &amp; time</span>
              <input
                type="datetime-local"
                required
                value={dateLocal}
                onChange={(e) => setDateLocal(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 outline-none focus:border-amber-200/60"
              />
            </label>
            <div className="relative">
              <label className="block">
                <span className="text-sm text-white/70">Location</span>
                <input
                  type="text"
                  placeholder="Search a city…"
                  value={location ? location.label : locationQuery}
                  onChange={(e) => {
                    setLocation(null);
                    setLocationQuery(e.target.value);
                  }}
                  onFocus={() => setGeoOpen(true)}
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 outline-none focus:border-amber-200/60"
                />
              </label>
              {geoOpen && geoResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-[#0b1330] border border-white/15 rounded-lg overflow-hidden shadow-xl">
                  {geoResults.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm"
                        onClick={() => {
                          setLocation(r);
                          setLocationQuery("");
                          setGeoOpen(false);
                        }}
                      >
                        {r.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <label className="block mt-4">
            <span className="text-sm text-white/70">Caption (optional, shown on the shirt)</span>
            <input
              type="text"
              maxLength={60}
              placeholder="Where it all began"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 outline-none focus:border-amber-200/60"
            />
          </label>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-[0.2em] text-white/50 mb-4">2. Shirt</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {(Object.keys(STYLES) as StyleKey[]).map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => setStyle(key)}
                className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                  style === key ? "border-amber-200 bg-white/10" : "border-white/15 hover:border-white/30"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{STYLES[key].label}</span>
                  <span className="text-white/70">{formatUSD(STYLES[key].priceCents)}</span>
                </div>
                <p className="text-xs text-white/50 mt-1">{STYLES[key].description}</p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c.key}
                onClick={() => setColor(c.key)}
                title={c.label}
                className={`w-9 h-9 rounded-full border-2 ${
                  color === c.key ? "border-amber-200" : "border-white/20"
                }`}
                style={{ background: c.swatch }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSize(s)}
                className={`px-3 py-1.5 rounded-lg border text-sm uppercase ${
                  size === s ? "border-amber-200 bg-white/10" : "border-white/15 hover:border-white/30"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-[0.2em] text-white/50 mb-4">3. Shipping</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" value={name} onChange={setName} required />
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field label="Phone (optional)" value={phone} onChange={setPhone} />
            <Field label="Country" value={country} onChange={setCountry} as="select">
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Field>
            <Field label="Address line 1" value={line1} onChange={setLine1} required className="sm:col-span-2" />
            <Field label="Address line 2 (optional)" value={line2} onChange={setLine2} className="sm:col-span-2" />
            <Field label="City" value={city} onChange={setCity} required />
            <Field label="State / county (optional)" value={state} onChange={setState} />
            <Field label="Postal code" value={postal} onChange={setPostal} required />
          </div>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-[0.2em] text-white/50 mb-4">4. Payment</h2>
          <div className="rounded-lg bg-white/5 border border-white/15 px-3 py-3">
            <CardElement
              options={{
                style: {
                  base: {
                    color: "#ffffff",
                    fontSize: "16px",
                    "::placeholder": { color: "rgba(255,255,255,0.4)" },
                  },
                  invalid: { color: "#fca5a5" },
                },
              }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2">
            Sandbox mode: use test card 4242 4242 4242 4242, any future expiry, any CVC.
          </p>
        </section>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !stripe}
          className="w-full rounded-full bg-amber-100 text-[#050814] font-medium py-3 hover:bg-white transition-colors disabled:opacity-50"
        >
          {submitting ? "Processing…" : `Pay ${formatUSD(total)} & print my sky`}
        </button>
      </form>

      <aside className="lg:sticky lg:top-24 h-fit space-y-4">
        <div className="aspect-[4/5] w-full">
          <SkyPreview input={previewInput} />
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-sm space-y-2">
          <Row label={STYLES[style].label} value={formatUSD(subtotal)} />
          <Row label="Shipping" value={formatUSD(shipping)} />
          <div className="border-t border-white/10 pt-2">
            <Row label="Total" value={formatUSD(total)} bold />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  as = "input",
  children,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  as?: "input" | "select";
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm text-white/70">{label}</span>
      {as === "select" ? (
        <select
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 outline-none focus:border-amber-200/60"
        >
          {children}
        </select>
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 outline-none focus:border-amber-200/60"
        />
      )}
    </label>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-medium" : "text-white/70"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
