'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { COLORS, SIZES, PRICE_USD } from '@/lib/catalog';

function encodeParams(params: Record<string, unknown>): string {
  const json = JSON.stringify(params);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function CustomizePage() {
  const [title, setTitle] = useState('The Night We Met');
  const [date, setDate] = useState('2019-06-15');
  const [place, setPlace] = useState('Brooklyn, NY');
  const [color, setColor] = useState('black');
  const [size, setSize] = useState('m');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shirtColor = COLORS.find((c) => c.id === color)!;
  const ink = shirtColor.dark ? 'light' : 'dark';

  const previewUrl = useMemo(() => {
    const d = encodeParams({
      title: title.trim() || 'Your title',
      date,
      place: place.trim() || undefined,
      ink,
    });
    return `/api/design?d=${d}`;
  }, [title, date, place, ink]);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, place, color, size }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError('Could not reach the server. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="starfield min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-serif text-2xl tracking-wide text-cream">
          Lunaria
        </Link>
        <span className="text-sm text-cream/50">Custom moon tee</span>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 pb-24 lg:grid-cols-2">
        {/* Form */}
        <section>
          <h1 className="text-4xl text-cream">Design your shirt</h1>
          <p className="mt-2 text-cream/60">
            The moon phase is computed from the date you choose — every shirt is
            one of a kind.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <label className="mb-2 block text-sm uppercase tracking-wider text-cream/60">
                Title
              </label>
              <input
                type="text"
                value={title}
                maxLength={60}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The Night We Met"
                className="w-full rounded-lg border border-cream/20 bg-night/60 px-4 py-3 text-cream outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm uppercase tracking-wider text-cream/60">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-cream/20 bg-night/60 px-4 py-3 text-cream outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm uppercase tracking-wider text-cream/60">
                Place <span className="normal-case text-cream/40">(optional)</span>
              </label>
              <input
                type="text"
                value={place}
                maxLength={60}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Brooklyn, NY"
                className="w-full rounded-lg border border-cream/20 bg-night/60 px-4 py-3 text-cream outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm uppercase tracking-wider text-cream/60">
                Shirt colour
              </label>
              <div className="flex flex-wrap gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    title={c.label}
                    className={`h-10 w-10 rounded-full border-2 transition ${
                      color === c.id
                        ? 'border-gold ring-2 ring-gold/40'
                        : 'border-cream/20'
                    }`}
                    style={{ backgroundColor: c.swatch }}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-cream/50">{shirtColor.label}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm uppercase tracking-wider text-cream/60">
                Size
              </label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`rounded-lg border px-4 py-2 text-sm uppercase transition ${
                      size === s
                        ? 'border-gold bg-gold text-night'
                        : 'border-cream/20 text-cream/70 hover:border-cream/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={checkout}
              disabled={loading || !title.trim() || !date}
              className="w-full rounded-full bg-gold px-8 py-4 text-lg font-medium text-night transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Preparing checkout…' : `Checkout — $${PRICE_USD}`}
            </button>
            <p className="text-center text-xs text-cream/40">
              Secure payment · Printed on demand · Free shipping
            </p>
          </div>
        </section>

        {/* Preview */}
        <section className="lg:sticky lg:top-8 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-cream/10 bg-night">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Your custom moon design"
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
          <p className="mt-3 text-center text-sm text-cream/50">
            Live preview — the real moon phase for {date || 'your date'}
          </p>
        </section>
      </div>
    </main>
  );
}
