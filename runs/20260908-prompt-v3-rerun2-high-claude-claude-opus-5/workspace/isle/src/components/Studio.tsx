'use client';

import { useEffect, useMemo, useState } from 'react';
import { renderChart, SHIRTS, SIZES, unengravable, type ShirtKey, type SizeKey, type Spec } from '@/lib/chart';
import { Garment } from './Tee';

const QUESTIONS: {
  key: keyof Spec;
  label: string;
  becomes: string;
  placeholder: string;
}[] = [
  { key: 'name', label: 'Your name', becomes: 'the island', placeholder: 'Marguerite' },
  { key: 'port', label: 'Where you are from', becomes: 'the port', placeholder: 'Lisbon' },
  { key: 'peak', label: 'What you are chasing', becomes: 'the mountain', placeholder: 'a quiet mind' },
  { key: 'bay', label: 'Where you feel safest', becomes: 'the bay', placeholder: 'Sunday' },
  { key: 'wilds', label: 'Where your hours go', becomes: 'the wilds', placeholder: 'late nights' },
  { key: 'dread', label: 'What you would rather avoid', becomes: 'the deep water', placeholder: 'small talk' },
];

const BLANK: Spec = {
  name: '',
  port: '',
  peak: '',
  dread: '',
  bay: '',
  wilds: '',
  year: '',
  shirt: 'natural',
  size: 'm',
};

const EXAMPLE: Spec = {
  name: 'Marguerite',
  port: 'Lisbon',
  peak: 'a quiet mind',
  dread: 'small talk',
  bay: 'Sunday',
  wilds: 'late nights',
  year: '1991',
  shirt: 'natural',
  size: 'm',
};

const PRICE = 48;

/** Only re-engrave once typing settles: the plate is ~2,000 vector elements. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Studio() {
  const [spec, setSpec] = useState<Spec>(BLANK);
  const [qty, setQty] = useState(1);
  const [plateOpen, setPlateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Until they have typed anything, show the worked example rather than a blank tee.
  const touched = QUESTIONS.some((q) => String(spec[q.key]).trim().length > 0);
  const shown: Spec = touched
    ? spec
    : { ...EXAMPLE, shirt: spec.shirt, size: spec.size, year: spec.year || EXAMPLE.year };

  const debounced = useDebounced(shown, 220);
  const svg = useMemo(() => renderChart(debounced), [debounced]);

  const missing = QUESTIONS.filter((q) => !String(spec[q.key]).trim()).length;
  const yearOk = /^\d{4}$/.test(spec.year);
  const badChars: Record<string, string[]> = {};
  for (const q of QUESTIONS) {
    const bad = unengravable(String(spec[q.key]));
    if (bad.length) badChars[q.key] = bad;
  }
  const engravable = Object.keys(badChars).length === 0;
  const ready = missing === 0 && yearOk && engravable;

  const set = (k: keyof Spec, v: string) => setSpec((s) => ({ ...s, [k]: v }));

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout could not be opened.');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="studio">
      <section className="panel">
        <h2>The Survey</h2>
        <p className="hint">
          Six questions. Short answers engrave best &#8212; a word or three.
        </p>

        {QUESTIONS.map((q) => (
          <div className="field" key={q.key}>
            <label htmlFor={`f-${q.key}`}>
              {q.label}
              <span className="becomes">becomes {q.becomes}</span>
            </label>
            <input
              id={`f-${q.key}`}
              value={String(spec[q.key])}
              maxLength={20}
              placeholder={q.placeholder}
              autoComplete="off"
              onChange={(e) => set(q.key, e.target.value)}
              aria-invalid={!!badChars[q.key]}
            />
            {badChars[q.key] ? (
              <p className="field-error">
                The press has no letter for {badChars[q.key].join(' ')} &#8212; this plate is cut
                in a 17th-century Latin face.
              </p>
            ) : null}
          </div>
        ))}

        <div className="row2">
          <div className="field">
            <label htmlFor="f-year">
              Charted in the year
              <span className="becomes">the date</span>
            </label>
            <input
              id="f-year"
              value={spec.year}
              inputMode="numeric"
              maxLength={4}
              placeholder="1991"
              onChange={(e) => set('year', e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
          <div className="field">
            <label>Copies</label>
            <div className="chips">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className="chip"
                  aria-label={`${n} ${n === 1 ? 'copy' : 'copies'}`}
                  aria-pressed={qty === n}
                  onClick={() => setQty(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="field">
          <label>Garment colour</label>
          <div className="swatches">
            {(Object.keys(SHIRTS) as ShirtKey[]).map((k) => (
              <button
                type="button"
                key={k}
                className="swatch"
                title={SHIRTS[k].label}
                aria-label={SHIRTS[k].label}
                aria-pressed={spec.shirt === k}
                style={{ background: SHIRTS[k].swatch }}
                onClick={() => set('shirt', k)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label>Size</label>
          <div className="chips">
            {SIZES.map((s) => (
              <button
                type="button"
                key={s}
                className="chip"
                aria-label={`Size ${s.toUpperCase()}`}
                aria-pressed={spec.size === s}
                onClick={() => set('size', s as SizeKey)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="buy">
          <div className="price">
            <span className="amt">${(PRICE * qty).toFixed(2)}</span>
            <span className="per">
              ${PRICE.toFixed(2)} each &#183; standard shipping free
            </span>
          </div>
          <button className="primary" disabled={!ready || busy} onClick={checkout}>
            {busy
              ? 'Opening checkout...'
              : !engravable
                ? 'Unengravable characters above'
                : ready
                  ? 'Commission this chart'
                  : `Answer ${missing + (yearOk ? 0 : 1)} more`}
          </button>
          {error ? <p className="error">{error}</p> : null}
          <p className="note">
            Nothing is printed until payment clears. Because each plate is engraved for one
            person, orders cannot be returned &#8212; but a misprint is replaced free.
          </p>
        </div>
      </section>

      <section className="stage">
        {plateOpen ? (
          <div className="plate-view" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="tee-frame">
            <div className={`tee${SHIRTS[shown.shirt].dark ? ' on-dark' : ''}`}>
              <Garment shirt={shown.shirt} />
              <div className="art" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          </div>
        )}
        <button className="detail-toggle" onClick={() => setPlateOpen((v) => !v)}>
          {plateOpen ? 'Back to the shirt' : 'Inspect the plate up close'}
        </button>
        <div className="specs">
          <ul>
            <li>Gildan 64000 softstyle, 100% ringspun cotton, unisex fit</li>
            <li>Full-front direct-to-garment, 15.6&#8243; wide at 200 dpi</li>
            <li>Two inks chosen for the cloth: deep indigo and oxblood on light, cream and brass on dark</li>
            <li>{touched ? 'This chart exists only for these answers.' : 'A worked example. Start typing to chart your own.'}</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
