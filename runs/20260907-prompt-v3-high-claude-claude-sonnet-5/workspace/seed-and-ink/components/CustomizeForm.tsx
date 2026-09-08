'use client';

import { useMemo, useState } from 'react';
import { ShirtMockup } from './ShirtMockup';
import { STYLES, StyleKey } from '@/lib/designs';
import { PALETTES, getPalette } from '@/lib/palettes';
import {
  MAX_QUANTITY,
  MAX_SEED_LENGTH,
  PRICE_USD_CENTS,
  SHIRT_COLORS,
  SHIRT_SIZES,
} from '@/lib/config';
import { randomSeedPhrase, seedCode } from '@/lib/seed';

const priceLabel = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function CustomizeForm() {
  const [seedText, setSeedText] = useState('lucky-comet-42');
  const [style, setStyle] = useState<StyleKey>('bloom');
  const [paletteKey, setPaletteKey] = useState('midnight');
  const [colorKey, setColorKey] = useState<string>(SHIRT_COLORS[1].key); // black shows designs well
  const [size, setSize] = useState('m');
  const [quantity, setQuantity] = useState(1);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const palette = getPalette(paletteKey);
  const garment = SHIRT_COLORS.find((c) => c.key === colorKey) ?? SHIRT_COLORS[0];
  const trimmedSeed = seedText.trim().slice(0, MAX_SEED_LENGTH);
  const code = useMemo(() => seedCode(trimmedSeed || 'seed'), [trimmedSeed]);

  async function handleCheckout() {
    setError(null);
    if (!trimmedSeed) {
      setError('Type a phrase to grow your design from first.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedText: trimmedSeed,
          style,
          palette: paletteKey,
          shirtColor: colorKey,
          size,
          quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Checkout could not be started.');
      }
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || 'Something went wrong starting checkout.');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-10">
      <div className="flex flex-col items-center">
        <ShirtMockup
          garmentHex={garment.hex}
          seedText={trimmedSeed}
          style={style}
          colors={palette.colors}
          view={view}
        />
        <div className="flex gap-2 mt-4 text-sm">
          <button
            onClick={() => setView('front')}
            className={`px-3 py-1 rounded-full border ${
              view === 'front'
                ? 'border-seed-500 text-white bg-seed-500/20'
                : 'border-ink-700 text-neutral-400'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setView('back')}
            className={`px-3 py-1 rounded-full border ${
              view === 'back'
                ? 'border-seed-500 text-white bg-seed-500/20'
                : 'border-ink-700 text-neutral-400'
            }`}
          >
            Back mark
          </button>
        </div>
        <p className="text-neutral-500 text-xs mt-3 text-center max-w-xs">
          Serial No. {code} — this exact design will only ever be printed for
          this seed phrase.
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-sm font-medium mb-2">
            1. Plant a seed
          </label>
          <div className="flex gap-2">
            <input
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              maxLength={MAX_SEED_LENGTH}
              placeholder="a name, a date, a lyric…"
              className="flex-1 bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 outline-none focus:border-seed-500"
            />
            <button
              onClick={() => setSeedText(randomSeedPhrase())}
              className="whitespace-nowrap px-3 py-2 rounded-lg border border-ink-700 text-sm text-neutral-300 hover:border-seed-500 hover:text-white transition"
              type="button"
            >
              Surprise me
            </button>
          </div>
          <p className="text-neutral-500 text-xs mt-1">
            Same phrase always regrows the same design — save it to reorder.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            2. Growth pattern
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStyle(s.key)}
                className={`text-left p-3 rounded-lg border transition ${
                  style === s.key
                    ? 'border-seed-500 bg-seed-500/10'
                    : 'border-ink-700 hover:border-neutral-500'
                }`}
              >
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-neutral-500">{s.blurb}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">3. Palette</label>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPaletteKey(p.key)}
                title={p.name}
                className={`w-9 h-9 rounded-full border-2 transition ${
                  paletteKey === p.key ? 'border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: p.swatch }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              4. Shirt color
            </label>
            <div className="flex flex-wrap gap-2">
              {SHIRT_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  onClick={() => setColorKey(c.key)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    colorKey === c.key ? 'border-seed-500' : 'border-ink-700'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Size</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 uppercase text-sm"
            >
              {SHIRT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-ink-700/60 pt-6">
          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input
              type="number"
              min={1}
              max={MAX_QUANTITY}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.max(1, Math.min(MAX_QUANTITY, Number(e.target.value) || 1)),
                )
              }
              className="w-20 bg-ink-900 border border-ink-700 rounded-lg px-3 py-2"
            />
          </div>
          <div className="text-right">
            <div className="text-2xl font-display">
              {priceLabel(PRICE_USD_CENTS * quantity)}
            </div>
            <div className="text-xs text-neutral-500">
              {priceLabel(PRICE_USD_CENTS)} each, shipping included
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-seed-500 hover:bg-seed-400 transition font-medium disabled:opacity-50"
        >
          {loading ? 'Starting checkout…' : 'Checkout with Stripe'}
        </button>
        <p className="text-neutral-500 text-xs">
          Test mode: use card 4242 4242 4242 4242, any future date/CVC/ZIP.
        </p>
      </div>
    </div>
  );
}
