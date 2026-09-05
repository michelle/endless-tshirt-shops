'use client';

import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  COLORS,
  COMPARE_AT_USD,
  FITS,
  PRICE_USD,
  PRINT_HEIGHT,
  PRINT_WIDTH,
  SIZES,
  THEMES,
  type ClockFormat,
  type ColorId,
  type Fit,
  type SizeId,
  type ThemeId,
} from '@/lib/catalog';
import { TIMEZONES, resolveTimeZone } from '@/lib/timezones';
import { THEME_DRAWERS } from './themes';
import { ShirtMockup } from './ShirtMockup';

const PREVIEW_WIDTH = Math.round(PRINT_WIDTH / 10); // 466
const PREVIEW_HEIGHT = Math.round(PRINT_HEIGHT / 10); // 584

type Step = 'idle' | 'rendering' | 'uploading' | 'redirecting';

export function ShirtStudio() {
  const [fit, setFit] = useState<Fit>('unisex');
  const [color, setColor] = useState<ColorId>('black');
  const [size, setSize] = useState<SizeId>('m');
  const [theme, setTheme] = useState<ThemeId>('starfield');
  const [tz, setTz] = useState('local');
  const [format, setFormat] = useState<ClockFormat>('24h');
  const [showMs, setShowMs] = useState(true);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const configRef = useRef({ theme, tz, format, showMs });

  useEffect(() => {
    configRef.current = { theme, tz, format, showMs };
  }, [theme, tz, format, showMs]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const canvas = canvasRef.current;
      if (canvas && !pausedRef.current) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cfg = configRef.current;
          THEME_DRAWERS[cfg.theme](ctx, canvas.width, canvas.height, {
            date: new Date(),
            timeZone: resolveTimeZone(cfg.tz),
            format: cfg.format,
            showMs: cfg.showMs,
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  async function handleFreezeAndCheckout() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    pausedRef.current = true;

    try {
      setStep('rendering');
      const frozenAt = new Date();

      // Render one final frame at full print resolution — the millisecond
      // this button is clicked becomes the shirt, forever.
      canvas.width = PRINT_WIDTH;
      canvas.height = PRINT_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported in this browser');
      THEME_DRAWERS[theme](ctx, PRINT_WIDTH, PRINT_HEIGHT, {
        date: frozenAt,
        timeZone: resolveTimeZone(tz),
        format,
        showMs,
      });

      const file = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Could not export artwork'))),
          'image/jpeg',
          0.92
        );
      });

      // Restore the live preview size immediately so the UI doesn't sit on
      // a giant offscreen canvas any longer than it has to.
      canvas.width = PREVIEW_WIDTH;
      canvas.height = PREVIEW_HEIGHT;
      pausedRef.current = false;

      setStep('uploading');
      const pathname = `artwork/${frozenAt.getTime()}-${fit}-${theme}.jpg`;
      const blob = await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/blob-upload',
      });

      setStep('redirecting');
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkUrl: blob.url,
          fit,
          color,
          size,
          theme,
          frozenAt: frozenAt.toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Checkout failed');
      window.location.href = json.url;
    } catch (err) {
      pausedRef.current = false;
      setStep('idle');
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  const busy = step !== 'idle';
  const busyLabel: Record<Step, string> = {
    idle: '',
    rendering: '⏳ Freezing this exact moment…',
    uploading: '📦 Packing your moment into a shirt…',
    redirecting: '🛒 Taking you to checkout…',
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr,1fr] lg:gap-16">
      <div className="flex flex-col items-center gap-6">
        <div
          className="w-full max-w-md rounded-[2.5rem] p-8 sm:p-10"
          style={{
            background:
              'radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.08), rgba(255,255,255,0) 60%)',
          }}
        >
          <ShirtMockup
            ref={canvasRef}
            fit={fit}
            swatch={COLORS[color].swatch}
            ink={COLORS[color].ink}
            canvasWidth={PREVIEW_WIDTH}
            canvasHeight={PREVIEW_HEIGHT}
          />
        </div>
        <p className="max-w-sm text-center text-sm text-white/60">
          This is ticking live, right now, in your browser. The second you check out is the
          second that gets printed — forever frozen, never repeated.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <OptionGroup label="Mood / theme">
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(THEMES) as ThemeId[]).map((id) => (
              <SwatchButton key={id} active={theme === id} onClick={() => setTheme(id)}>
                <span className="block text-sm font-semibold">{THEMES[id].label}</span>
                <span className="block text-xs opacity-70">{THEMES[id].blurb}</span>
              </SwatchButton>
            ))}
          </div>
        </OptionGroup>

        <div className="grid grid-cols-2 gap-6">
          <OptionGroup label="Fit">
            <div className="flex gap-3">
              {(Object.keys(FITS) as Fit[]).map((id) => (
                <SwatchButton key={id} active={fit === id} onClick={() => setFit(id)} compact>
                  {FITS[id].label}
                </SwatchButton>
              ))}
            </div>
          </OptionGroup>

          <OptionGroup label="Size">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SIZES) as SizeId[]).map((id) => (
                <SwatchButton key={id} active={size === id} onClick={() => setSize(id)} compact>
                  {SIZES[id].label}
                </SwatchButton>
              ))}
            </div>
          </OptionGroup>
        </div>

        <OptionGroup label="Color">
          <div className="flex flex-wrap gap-3">
            {(Object.keys(COLORS) as ColorId[]).map((id) => (
              <button
                key={id}
                onClick={() => setColor(id)}
                title={COLORS[id].label}
                className={`h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-dusk-950 transition ${
                  color === id ? 'ring-candy-pink scale-110' : 'ring-white/10'
                }`}
                style={{ background: COLORS[id].swatch }}
                aria-label={COLORS[id].label}
              />
            ))}
          </div>
        </OptionGroup>

        <div className="grid grid-cols-2 gap-6">
          <OptionGroup label="Timezone">
            <select
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-candy-pink"
            >
              {TIMEZONES.map((t) => (
                <option key={t.value} value={t.value} className="bg-dusk-900">
                  {t.label}
                </option>
              ))}
            </select>
          </OptionGroup>

          <OptionGroup label="Clock">
            <div className="flex gap-3">
              <SwatchButton active={format === '12h'} onClick={() => setFormat('12h')} compact>
                12h
              </SwatchButton>
              <SwatchButton active={format === '24h'} onClick={() => setFormat('24h')} compact>
                24h
              </SwatchButton>
            </div>
          </OptionGroup>
        </div>

        <label className="flex items-center gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={showMs}
            onChange={(e) => setShowMs(e.target.checked)}
            className="h-4 w-4 rounded border-white/30 bg-transparent accent-candy-pink"
          />
          Show milliseconds (recommended — it's the whole point)
        </label>

        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-white">${PRICE_USD.toFixed(2)}</span>
          <span className="text-lg text-white/40 line-through">${COMPARE_AT_USD.toFixed(2)}</span>
          <span className="rounded-full bg-candy-mint/20 px-2 py-0.5 text-xs font-semibold text-candy-mint">
            Free worldwide shipping
          </span>
        </div>

        <button
          onClick={handleFreezeAndCheckout}
          disabled={busy}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-candy-pink via-candy-lavender to-candy-gold px-8 py-4 text-lg font-bold text-dusk-950 shadow-glow transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy ? busyLabel[step] : '✨ Freeze this moment & check out'}
        </button>

        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <p className="text-xs text-white/40">
          Payments powered by Stripe. Printed &amp; shipped by Prodigi. Your artwork is uploaded
          only after you click checkout — nothing is printed until payment succeeds.
        </p>
      </div>
    </div>
  );
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</span>
      {children}
    </div>
  );
}

function SwatchButton({
  active,
  onClick,
  children,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border text-left transition ${compact ? 'px-4 py-2 text-sm' : 'px-4 py-3'} ${
        active
          ? 'border-candy-pink bg-candy-pink/15 text-white'
          : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25'
      }`}
    >
      {children}
    </button>
  );
}
