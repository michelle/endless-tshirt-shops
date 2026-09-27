'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SeedCanvas from '@/components/SeedCanvas';
import {
  GARMENTS,
  getGarment,
  getPalette,
  MAX_WORD_LENGTH,
  normalizeWord,
  PALETTES,
  PRICE_CENTS,
  SIZES,
  type Size,
} from '@/lib/catalogue';

const WORD_IDEAS = ['aurora', 'kyoto', 'mama', '1997', 'halo', 'odyssey'];

function Customizer() {
  const params = useSearchParams();
  const [word, setWord] = useState(() =>
    normalizeWord(params.get('word') ?? ''),
  );
  const [paletteId, setPaletteId] = useState(
    () => getPalette(params.get('palette') ?? '')?.id ?? PALETTES[0].id,
  );
  const [garmentId, setGarmentId] = useState(
    () => getGarment(params.get('garment') ?? '')?.id ?? GARMENTS[0].id,
  );
  const [size, setSize] = useState<Size>(() =>
    (SIZES as readonly string[]).includes(params.get('size') ?? '')
      ? (params.get('size') as Size)
      : 'm',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const palette = useMemo(() => getPalette(paletteId)!, [paletteId]);
  const garment = useMemo(() => getGarment(garmentId)!, [garmentId]);
  const displayWord = word || 'your word';

  async function buy() {
    setError(null);
    if (!word) {
      setError('Give your shirt a word first — anything that means something to you.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          paletteId,
          garmentColor: garmentId,
          size,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBusy(false);
    }
  }

  return (
    <div className="create-wrap">
      <div className="controls">
        <div>
          <p className="kicker">Grow yours</p>
          <h1 style={{ margin: '0 0 6px', fontSize: 32 }}>One word. One shirt.</h1>
          <p style={{ color: 'var(--ink-dim)', margin: 0, lineHeight: 1.6 }}>
            The preview below is the actual algorithm output — what you see is
            what gets printed.
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="word">Your word</label>
          <input
            id="word"
            className="word-input"
            value={word}
            maxLength={MAX_WORD_LENGTH}
            placeholder="a name, a place, a date…"
            onChange={(e) => setWord(normalizeWord(e.target.value))}
          />
          <p className="word-hint">
            Try: {WORD_IDEAS.map((w, i) => (
              <span key={w}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setWord(w);
                  }}
                  style={{ color: 'var(--accent)' }}
                >
                  {w}
                </a>
                {i < WORD_IDEAS.length - 1 ? ' · ' : ''}
              </span>
            ))}
            <br />
            Same word always grows the same art — change one letter and everything changes.
          </p>
        </div>

        <div>
          <span className="field-label">Palette</span>
          <div className="chip-row">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                className="chip"
                aria-pressed={p.id === paletteId}
                onClick={() => setPaletteId(p.id)}
              >
                <span className="palette-dots">
                  {p.colors.slice(0, 3).map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>
          <p className="palette-note">
            {palette.blurb}{' '}
            {palette.bestOn !== 'any' &&
              `Looks best on ${palette.bestOn} garments.`}
          </p>
        </div>

        <div>
          <span className="field-label">Shirt color</span>
          <div className="chip-row">
            {GARMENTS.map((g) => (
              <button
                key={g.id}
                className="chip"
                aria-pressed={g.id === garmentId}
                onClick={() => setGarmentId(g.id)}
              >
                <span className="swatch" style={{ background: g.hex }} />
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="field-label">Size</span>
          <div className="chip-row">
            {SIZES.map((s) => (
              <button
                key={s}
                className="chip"
                aria-pressed={s === size}
                onClick={() => setSize(s)}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="price-row">
          <span className="price">${(PRICE_CENTS / 100).toFixed(0)}</span>
          <span className="price-note">incl. standard worldwide shipping</span>
        </div>

        {error && <div className="error-box">{error}</div>}

        <button className="btn btn-primary" onClick={buy} disabled={busy}>
          {busy ? 'Opening secure checkout…' : 'Buy this one-of-one shirt'}
        </button>
        <p className="word-hint">
          Secure payment by Stripe. Your print file is only sent to the lab
          after payment confirms.
        </p>
      </div>

      <div>
        <div className="preview-card" style={{ background: garment.hex }}>
          <div style={{ aspectRatio: '5 / 6' }} />
          <div className="preview-collar" />
          <div className="preview-art">
            <SeedCanvas
              word={displayWord}
              palette={palette}
              darkGarment={garment.dark}
              width={1000}
              height={1260}
            />
          </div>
        </div>
        <div className="preview-meta" style={{ maxWidth: 560, margin: '14px auto 0' }}>
          <span>
            seed: “{displayWord}” · {palette.name.toLowerCase()} on {garment.label.toLowerCase()}
          </span>
          <span>bella + canvas 3001 · {size.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense>
      <Customizer />
    </Suspense>
  );
}
