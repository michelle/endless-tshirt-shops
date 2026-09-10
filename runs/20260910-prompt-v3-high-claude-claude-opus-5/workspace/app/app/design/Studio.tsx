'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildSpecimen } from '@/lib/species';
import { plateSvg } from '@/lib/draw/plate';
import { shirtSvg } from '@/lib/draw/shirt';
import { PALETTES } from '@/lib/palettes';
import { COLORS, COLOR_BY_ID, SIZES, MAX_QTY } from '@/lib/catalog';
import {
  type Design, encodeDesign, designErrors, unitPriceCents, formatMoney,
} from '@/lib/design';
import { COUNTRIES } from '@/lib/countries';

type ShipOption = { method: string; label: string; note: string; amountCents: number };

type QuoteState = {
  loading: boolean;
  options: ShipOption[];
  live: boolean;
  error: string | null;
};

const EXAMPLES: Design[] = [
  { n: 'Ada Lovelace', d: '1815-12-10', p: 'London', pal: 'cyanotype', col: 'natural', sz: 'm', q: 1 },
  { n: 'Yusuf Adeyemi', d: '1994-06-23', p: 'Lagos', pal: 'coral', col: 'black', sz: 'l', q: 1 },
  { n: 'Marta Rossi', d: '1978-03-04', p: 'Bologna', pal: 'foxglove', col: 'sand', sz: 's', q: 1 },
];

export default function Studio({ initial }: { initial: Design }) {
  const [design, setDesign] = useState<Design>(initial);
  const [view, setView] = useState<'shirt' | 'plate'>('shirt');
  const [showDelivery, setShowDelivery] = useState(false);
  const [address, setAddress] = useState({
    name: '', email: '', line1: '', line2: '', townOrCity: '',
    stateOrCounty: '', postalOrZipCode: '', countryCode: 'US',
  });
  const [method, setMethod] = useState<string>('Budget');
  const [quote, setQuote] = useState<QuoteState>({ loading: false, options: [], live: false, error: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);

  const set = useCallback(<K extends keyof Design>(key: K, value: Design[K]) => {
    setDesign((d) => ({ ...d, [key]: value }));
  }, []);

  const errors = useMemo(() => designErrors(design), [design]);
  const ready = errors.length === 0;

  // The preview is generated from exactly the same code the print file uses.
  const preview = useMemo(() => {
    const shown: Design = ready
      ? design
      : { ...design, n: design.n || 'Your Name', d: design.d || '1990-05-16', p: design.p || 'Your Town' };
    const specimen = buildSpecimen({ name: shown.n, date: shown.d, place: shown.p, paletteId: shown.pal });
    const colour = COLOR_BY_ID[shown.col];
    return {
      specimen,
      shirt: shirtSvg(specimen, colour.hex, colour.dark),
      plate: plateSvg(specimen, { dark: colour.dark, garmentHex: colour.hex }),
    };
  }, [design, ready]);

  const token = useMemo(() => encodeDesign(design), [design]);

  // Keep the design in the URL so a specimen can be bookmarked or shared.
  useEffect(() => {
    if (!ready) return;
    const url = `${window.location.pathname}?d=${encodeURIComponent(token)}`;
    window.history.replaceState(null, '', url);
  }, [token, ready]);

  const unit = unitPriceCents(design);
  const subtotal = unit * design.q;
  const chosen = quote.options.find((o) => o.method === method) ?? quote.options[0] ?? null;
  const total = subtotal + (chosen?.amountCents ?? 0);

  const fetchQuote = useCallback(async (country: string) => {
    if (!ready) return;
    setQuote((q) => ({ ...q, loading: true, error: null }));
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ d: encodeDesign(design), countryCode: country }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not price delivery.');
      setQuote({ loading: false, options: json.options, live: json.live, error: null });
      setMethod((m) => (json.options.some((o: ShipOption) => o.method === m) ? m : json.options[0]?.method));
    } catch (err) {
      setQuote({ loading: false, options: [], live: false, error: err instanceof Error ? err.message : 'Quote failed.' });
    }
  }, [design, ready]);

  useEffect(() => {
    if (!showDelivery || !ready) return;
    const t = setTimeout(() => fetchQuote(address.countryCode), 250);
    return () => clearTimeout(t);
    // Re-quote when anything that changes cost changes.
  }, [showDelivery, ready, address.countryCode, design.sz, design.col, design.q, fetchQuote]);

  async function checkout() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ d: token, method: chosen?.method, email: address.email, address }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout.');
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  const addressComplete =
    address.name.trim().length > 1 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address.email.trim()) &&
    address.line1.trim().length > 2 &&
    address.townOrCity.trim().length > 1 &&
    address.postalOrZipCode.trim().length > 2;

  return (
    <div className="wrap studio">
      <div className="stage">
        <div className="stage-tabs">
          <button className="stage-tab" aria-pressed={view === 'shirt'} onClick={() => setView('shirt')}>
            On the shirt
          </button>
          <button className="stage-tab" aria-pressed={view === 'plate'} onClick={() => setView('plate')}>
            The plate
          </button>
          <a
            className="stage-tab"
            href={`/api/artwork?d=${encodeURIComponent(token)}&w=1400&garment=1`}
            target="_blank"
            rel="noreferrer"
            style={{ marginLeft: 'auto', textDecoration: 'none' }}
          >
            Print proof ↗
          </a>
        </div>

        <div dangerouslySetInnerHTML={{ __html: view === 'shirt' ? preview.shirt : preview.plate }} />

        <div className="stage-caption">
          <div>
            <div className="binomial">
              {preview.specimen.taxon.genus} {preview.specimen.taxon.epithet}
            </div>
            <div className="common">
              “{preview.specimen.taxon.common}” · var. {preview.specimen.taxon.variety}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono">{preview.specimen.taxon.accession}</div>
            <div className="common">
              {preview.specimen.morph.habit}, {preview.specimen.morph.leafForm} leaves
            </div>
          </div>
        </div>
      </div>

      <div>
        <section className="panel">
          <h2>
            <span>01</span> The specimen
          </h2>
          <p className="panel-hint">
            Three answers decide everything: the silhouette, the leaf, the flower, the palette and
            the Latin name. Change one letter and a different plant grows.
          </p>

          <div className="field">
            <label htmlFor="f-name">Whose specimen is this?</label>
            <input
              id="f-name"
              value={design.n}
              maxLength={40}
              placeholder="Ada Lovelace"
              onChange={(e) => set('n', e.target.value)}
            />
            <p className="field-note">
              The first name becomes the genus; the surname signs the plate as its collector.
            </p>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="f-date">A date that matters</label>
              <input id="f-date" type="date" value={design.d} min="1800-01-01" max="2100-12-31" onChange={(e) => set('d', e.target.value)} />
              <p className="field-note">Sets the flowering season and the species epithet.</p>
            </div>
            <div className="field">
              <label htmlFor="f-place">A place that matters</label>
              <input
                id="f-place"
                value={design.p}
                maxLength={40}
                placeholder="London"
                onChange={(e) => set('p', e.target.value)}
              />
              <p className="field-note">Becomes the locality and the common name.</p>
            </div>
          </div>

          <div className="field">
            <label>Ink</label>
            <div className="palette-grid">
              <button
                className="palette-btn"
                aria-pressed={design.pal === 'auto'}
                onClick={() => set('pal', 'auto')}
              >
                <span className="palette-dots">
                  <i style={{ background: '#6d7c4e' }} />
                  <i style={{ background: '#a8574a' }} />
                  <i style={{ background: '#2f2a20' }} />
                </span>
                Chosen for you
              </button>
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  className="palette-btn"
                  aria-pressed={design.pal === p.id}
                  title={p.blurb}
                  onClick={() => set('pal', p.id)}
                >
                  <span className="palette-dots">
                    <i style={{ background: p.onLight.leaf }} />
                    <i style={{ background: p.onLight.accent }} />
                    <i style={{ background: p.onLight.ink }} />
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Try someone else&apos;s</label>
            <div className="chips">
              {EXAMPLES.map((e) => (
                <button key={e.n} className="chip" onClick={() => setDesign({ ...e, sz: design.sz, q: design.q })}>
                  {e.n}
                </button>
              ))}
            </div>
          </div>

          {errors.length > 0 && (
            <div className="notice">
              {errors[0]} <span className="summary-muted">— the preview shows an example until then.</span>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>
            <span>02</span> The garment
          </h2>
          <p className="panel-hint">
            Gildan 64000 softstyle, printed direct-to-garment. Dark shirts get the light-ink half of
            your palette automatically.
          </p>

          <div className="field">
            <label>Colour — {COLOR_BY_ID[design.col].name}</label>
            <div className="swatches">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  className="swatch"
                  style={{ background: c.hex }}
                  aria-pressed={design.col === c.id}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => set('col', c.id)}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label>Size</label>
            <div className="chips">
              {SIZES.map((s) => (
                <button key={s.id} className="chip" aria-pressed={design.sz === s.id} onClick={() => set('sz', s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field" style={{ maxWidth: 200 }}>
            <label htmlFor="f-qty">Quantity</label>
            <select id="f-qty" value={design.q} onChange={(e) => set('q', Number(e.target.value))}>
              {Array.from({ length: MAX_QTY }, (_, i) => i + 1).map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div className="summary">
            <div className="summary-row">
              <span>
                Specimen tee × {design.q} · {COLOR_BY_ID[design.col].name}, {design.sz.toUpperCase()}
              </span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="summary-row summary-muted">
              <span>Delivery</span>
              <span>{chosen ? formatMoney(chosen.amountCents) : 'quoted next'}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>
          </div>

          {!showDelivery && (
            <div className="btn-row">
              <button
                className="btn"
                disabled={!ready}
                onClick={() => {
                  setShowDelivery(true);
                  setTimeout(() => deliveryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
                }}
              >
                Continue to delivery
              </button>
              {!ready && <span className="btn-note">Finish the specimen first</span>}
            </div>
          )}
        </section>

        {showDelivery && (
          <section className="panel" ref={deliveryRef}>
            <h2>
              <span>03</span> Where it goes
            </h2>
            <p className="panel-hint">
              We price delivery from the print facility nearest you before you pay, so nothing
              changes after checkout.
            </p>

            <div className="field-row">
              <div className="field">
                <label htmlFor="a-name">Recipient</label>
                <input id="a-name" value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="a-email">Email</label>
                <input id="a-email" type="email" value={address.email} onChange={(e) => setAddress({ ...address, email: e.target.value })} />
              </div>
            </div>

            <div className="field">
              <label htmlFor="a-line1">Address</label>
              <input id="a-line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="a-line2">Address line 2 (optional)</label>
              <input id="a-line2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="a-city">Town or city</label>
                <input id="a-city" value={address.townOrCity} onChange={(e) => setAddress({ ...address, townOrCity: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="a-state">State / county</label>
                <input id="a-state" value={address.stateOrCounty} onChange={(e) => setAddress({ ...address, stateOrCounty: e.target.value })} />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="a-zip">Postal / ZIP code</label>
                <input id="a-zip" value={address.postalOrZipCode} onChange={(e) => setAddress({ ...address, postalOrZipCode: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="a-country">Country</label>
                <select
                  id="a-country"
                  value={address.countryCode}
                  onChange={(e) => setAddress({ ...address, countryCode: e.target.value })}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>
                Delivery {quote.loading && <span className="spin" />}
              </label>
              {quote.error && <div className="notice">{quote.error}</div>}
              <div className="ship-options">
                {quote.options.map((o) => (
                  <button
                    key={o.method}
                    className="ship-option"
                    aria-pressed={chosen?.method === o.method}
                    onClick={() => setMethod(o.method)}
                  >
                    <span>
                      {o.label}
                      <small>{o.note}</small>
                    </span>
                    <b>{o.amountCents === 0 ? 'Free' : formatMoney(o.amountCents)}</b>
                  </button>
                ))}
                {!quote.loading && quote.options.length === 0 && !quote.error && (
                  <p className="summary-muted">Choose a country to see delivery options.</p>
                )}
              </div>
              {!quote.live && quote.options.length > 0 && (
                <p className="field-note">
                  Showing standard rates — our printer&apos;s live quote was unavailable just now.
                </p>
              )}
            </div>

            <div className="summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery{chosen ? ` · ${chosen.label}` : ''}</span>
                <span>{chosen ? formatMoney(chosen.amountCents) : '—'}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>

            {error && <div className="notice">{error}</div>}

            <div className="btn-row">
              <button className="btn" disabled={!ready || !addressComplete || !chosen || submitting} onClick={checkout}>
                {submitting ? 'Opening Stripe…' : `Pay ${formatMoney(total)}`}
              </button>
              <span className="btn-note">Secure checkout by Stripe</span>
            </div>
            <p className="field-note" style={{ marginTop: 14 }}>
              Nothing is sent to the press until your payment clears. Test card 4242 4242 4242 4242,
              any future expiry, any CVC.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
