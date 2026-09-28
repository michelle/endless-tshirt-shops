'use client';

import { useMemo, useState } from 'react';
import DesignSvg from './DesignSvg';
import {
  contrastRatio,
  INKS,
  MIN_CONTRAST,
  SHIRTS,
  SIZES,
  STYLES,
  TEXT_RE,
  type StyleId,
} from '@/lib/catalog';
import { PRINT_HEIGHT, PRINT_WIDTH } from '@/lib/print-const';

const STYLE_SAMPLES: Record<StyleId, { family: string; label: string }> = {
  monolith: { family: "'Archivo Black', sans-serif", label: 'Monolith' },
  echo: { family: "'Anton', sans-serif", label: 'Echo' },
  heritage: { family: "'Libre Baskerville', serif", label: 'Heritage' },
  arc: { family: "'Anton', sans-serif", label: 'Arc' },
};

// Chest print-area box within the tee silhouette viewBox (0 0 1000 1100).
const TEE_VIEW = { w: 1000, h: 1100 };
const CHEST = { x: 315, y: 305, w: 370, h: 457 };

function TeePreview({
  text,
  style,
  inkHex,
  shirtHex,
}: {
  text: string;
  style: StyleId;
  inkHex: string;
  shirtHex: string;
}) {
  return (
    <svg viewBox={`0 0 ${TEE_VIEW.w} ${TEE_VIEW.h}`} role="img" aria-label="T-shirt preview">
      {/* tee silhouette */}
      <path
        d={`
          M 355 70
          C 320 82 268 96 220 128
          L 82 252
          C 74 260 74 272 82 280
          L 158 356
          C 166 364 178 364 186 356
          L 252 296
          L 268 992
          C 268 1002 276 1010 286 1010
          C 420 1026 580 1026 714 1010
          C 724 1010 732 1002 732 992
          L 748 296
          L 814 356
          C 822 364 834 364 842 356
          L 918 280
          C 926 272 926 260 918 252
          L 780 128
          C 732 96 680 82 645 70
          C 618 122 382 122 355 70
          Z
        `}
        fill={shirtHex}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="3"
      />
      {/* subtle collar rib */}
      <path
        d="M 355 70 C 382 122 618 122 645 70 C 612 104 388 104 355 70 Z"
        fill="rgba(0,0,0,0.18)"
      />
      {/* design layer: same coordinate space as the print file */}
      <svg
        x={CHEST.x}
        y={CHEST.y}
        width={CHEST.w}
        height={CHEST.h}
        viewBox={`0 0 ${PRINT_WIDTH} ${PRINT_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <DesignSvg text={text} style={style} inkHex={inkHex} />
      </svg>
    </svg>
  );
}

export default function Customizer() {
  const [text, setText] = useState('ROAM');
  const [style, setStyle] = useState<StyleId>('arc');
  const [ink, setInk] = useState('chalk');
  const [shirt, setShirt] = useState('black');
  const [size, setSize] = useState('m');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const textValid = TEXT_RE.test(trimmed);
  const textProblem =
    trimmed.length === 0
      ? 'Type a word first'
      : trimmed.length > 14
        ? 'Keep it to 14 characters'
        : !textValid
          ? "Only letters, digits, spaces and & ' ! ? . -"
          : null;

  const ratio = contrastRatio(INKS[ink].hex, SHIRTS[shirt].hex);
  const contrastOk = ratio >= MIN_CONTRAST;
  const canBuy = textValid && contrastOk && !busy;

  const previewText = useMemo(() => (textValid ? trimmed : 'WORD'), [textValid, trimmed]);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, style, ink, shirt, size }),
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
    <div className="customizer-grid">
      <div className="preview-wrap">
        <TeePreview
          text={previewText}
          style={style}
          inkHex={INKS[ink].hex}
          shirtHex={SHIRTS[shirt].hex}
        />
        <div className="preview-caption">
          {SHIRTS[shirt].label} tee · {INKS[ink].label} ink · {style}
        </div>
      </div>

      <div>
        <div className="control-group">
          <p className="control-label">1 — Your word</p>
          <input
            className="word-input"
            value={text}
            maxLength={20}
            onChange={(e) => setText(e.target.value)}
            placeholder="ROAM"
            aria-label="Your word"
          />
          <div className="char-count">{trimmed.length}/14</div>
          {trimmed.length > 0 && !textValid && <div className="field-error">{textProblem}</div>}
        </div>

        <div className="control-group">
          <p className="control-label">2 — Style</p>
          <div className="style-grid">
            {STYLES.map((s) => (
              <button
                key={s}
                className={`style-card ${s === style ? 'active' : ''}`}
                onClick={() => setStyle(s)}
              >
                <span className="sample" style={{ fontFamily: STYLE_SAMPLES[s].family }}>
                  {s === 'monolith' ? (
                    <>
                      W<br />O
                    </>
                  ) : s === 'echo' ? (
                    <>
                      <span style={{ opacity: 0.4 }}>WD</span>
                      <br />
                      WD
                    </>
                  ) : s === 'heritage' ? (
                    <>— Wo —</>
                  ) : (
                    <>◠ WD</>
                  )}
                </span>
                <span className="name">{STYLE_SAMPLES[s].label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <p className="control-label">3 — Ink</p>
          <div className="swatches">
            {Object.entries(INKS).map(([id, v]) => (
              <button
                key={id}
                className={`swatch ${id === ink ? 'active' : ''}`}
                style={{ background: v.hex }}
                title={v.label}
                aria-label={`Ink ${v.label}`}
                onClick={() => setInk(id)}
              />
            ))}
          </div>
          <div className="swatch-name">{INKS[ink].label}</div>
        </div>

        <div className="control-group">
          <p className="control-label">4 — Shirt</p>
          <div className="swatches">
            {Object.entries(SHIRTS).map(([id, v]) => (
              <button
                key={id}
                className={`swatch ${id === shirt ? 'active' : ''}`}
                style={{ background: v.hex }}
                title={v.label}
                aria-label={`Shirt ${v.label}`}
                onClick={() => setShirt(id)}
              />
            ))}
          </div>
          <div className="swatch-name">{SHIRTS[shirt].label}</div>
        </div>

        <div className="control-group">
          <p className="control-label">5 — Size</p>
          <div className="size-row">
            {SIZES.map((s) => (
              <button
                key={s}
                className={`size-btn ${s === size ? 'active' : ''}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="buy-panel">
          <div className="price-line">
            <span>One-of-One Tee</span>
            <span>$29.00</span>
          </div>
          <div className="price-line">
            <span>Standard shipping (5–8 business days)</span>
            <span>$4.99</span>
          </div>
          <div className="price-line total">
            <span>Total</span>
            <span>$33.99</span>
          </div>
          <button className="buy-btn" disabled={!canBuy} onClick={buy}>
            {busy ? 'Taking you to checkout…' : 'Buy yours — $29'}
          </button>
          {!contrastOk && (
            <div className="buy-hint">
              {INKS[ink].label} ink won't read on a {SHIRTS[shirt].label} shirt — pick a
              higher-contrast combo.
            </div>
          )}
          {contrastOk && !textValid && <div className="buy-hint">{textProblem}</div>}
          {error && <div className="buy-hint">{error}</div>}
        </div>
      </div>
    </div>
  );
}
