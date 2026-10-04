'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SkyChart, { useChartStats } from './SkyChart'
import ShirtMockup from './ShirtMockup'
import PlaceSearch from './PlaceSearch'
import {
  COLORS,
  SIZES,
  TITLE_PRESETS,
  PRICE_CENTS,
  validateSpec,
  titleFor,
} from '@/lib/spec'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Customizer({ initial }) {
  const router = useRouter()
  const [form, setForm] = useState(() => ({
    t: 'born',
    ti: '',
    d: initial?.d || todayStr(),
    tm: initial?.tm || '22:00',
    p: initial?.p || '',
    la: initial?.la ?? null,
    lo: initial?.lo ?? null,
    tz: initial?.tz || 'UTC',
    dg: initial?.dg || '',
    c: initial?.c || 'black',
    s: initial?.s || 'm',
    q: initial?.q || 1,
    ...(initial?.t ? { t: initial.t, ti: initial.t === 'custom' ? (initial.ti || '') : '' } : {}),
  }))
  const [selectedPlace, setSelectedPlace] = useState(
    initial && initial.la != null ? { label: initial.p, tz: initial.tz } : null
  )
  const [view, setView] = useState('shirt')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const spec = useMemo(() => {
    if (form.la == null || form.lo == null) return null
    return validateSpec({ ...form, la: Number(form.la), lo: Number(form.lo) })
  }, [form])

  const stats = useChartStats(spec)

  const colorObj = COLORS.find((c) => c.id === form.c) || COLORS[0]
  const ready = Boolean(spec)
  const title = titleFor({ ...form })

  async function checkout() {
    if (!spec || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Checkout could not be started.')
      }
      window.location.href = data.url
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  const moonFact = stats?.moonPhase
    ? `moon ${Math.round(stats.moonPhase.illum * 100)}% ${stats.moonPhase.name.toLowerCase()}`
    : 'moon below the horizon'
  const planetFact = stats?.planets?.length
    ? `${stats.planets.join(' + ')} visible`
    : 'no naked-eye planets up'

  return (
    <div className="customizer">
      {/* ---------------- form ---------------- */}
      <div className="cz-panel">
        <div className="field">
          <span className="f-label">№ 01 — The moment</span>
          <div className="chips">
            {TITLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip${form.t === p.id ? ' on' : ''}`}
                onClick={() => set({ t: p.id })}
              >
                {p.label}
              </button>
            ))}
          </div>
          {form.t === 'custom' && (
            <div style={{ marginTop: 12 }}>
              <input
                type="text"
                maxLength={34}
                value={form.ti}
                placeholder="Your words, in capitals"
                onChange={(e) => set({ ti: e.target.value })}
              />
              <div className="hint">{34 - form.ti.length} characters left</div>
            </div>
          )}
        </div>

        <div className="row2">
          <div className="field">
            <span className="f-label">№ 02 — The date</span>
            <input type="date" min="1925-01-01" max="2035-12-31" value={form.d} onChange={(e) => set({ d: e.target.value })} />
          </div>
          <div className="field">
            <span className="f-label">№ 03 — The time</span>
            <input type="time" value={form.tm} onChange={(e) => set({ tm: e.target.value })} />
            <div className="hint">local clock time</div>
          </div>
        </div>

        <div className="field">
          <span className="f-label">№ 04 — The place</span>
          <PlaceSearch
            selected={selectedPlace}
            onSelect={(place) => {
              if (place) {
                setSelectedPlace(place)
                set({
                  p: place.label,
                  la: place.lat,
                  lo: place.lon,
                  tz: place.tz,
                })
              } else {
                setSelectedPlace(null)
                set({ p: '', la: null, lo: null, tz: 'UTC' })
              }
            }}
          />
          {selectedPlace && <div className="hint">we compute the sky for the exact coordinates &amp; timezone</div>}
        </div>

        <div className="field">
          <span className="f-label">№ 05 — A dedication · optional</span>
          <input
            type="text"
            maxLength={46}
            value={form.dg}
            placeholder="for Emma, my whole sky"
            onChange={(e) => set({ dg: e.target.value })}
          />
          <div className="hint">set in italic under the chart — {46 - form.dg.length} characters left</div>
        </div>

        <div className="field">
          <span className="f-label">№ 06 — The shirt</span>
          <div className="swatches">
            {COLORS.map((c) => (
              <button key={c.id} type="button" className={`swatch${form.c === c.id ? ' on' : ''}`} onClick={() => set({ c: c.id })}>
                <span className="dot" style={{ background: c.hex }} />
                {c.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="chips" style={{ marginBottom: 14 }}>
              {SIZES.map((s) => (
                <button key={s.id} type="button" className={`chip${form.s === s.id ? ' on' : ''}`} onClick={() => set({ s: s.id })}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="qty">
              <button type="button" aria-label="fewer" onClick={() => set({ q: Math.max(1, form.q - 1) })}>−</button>
              <span>{form.q}</span>
              <button type="button" aria-label="more" onClick={() => set({ q: Math.min(3, form.q + 1) })}>+</button>
            </div>
            <div className="hint">chest widths: XS 31–34″ · S 34–37″ · M 38–41″ · L 42–45″ · XL 46–49″ · 2XL+ wider still</div>
          </div>
        </div>
      </div>

      {/* ---------------- stage ---------------- */}
      <div className="cz-stage">
        <div className="stage-card">
          <div className="stage-toggle">
            <button type="button" className={`toggle-btn${view === 'shirt' ? ' on' : ''}`} onClick={() => setView('shirt')}>
              ON THE SHIRT
            </button>
            <button type="button" className={`toggle-btn${view === 'art' ? ' on' : ''}`} onClick={() => setView('art')}>
              FULL ARTWORK
            </button>
          </div>
          {spec ? (
            view === 'shirt' ? (
              <ShirtMockup spec={spec} color={colorObj} />
            ) : (
              <div style={{ background: colorObj.hex, borderRadius: 14, padding: '10px' }}>
                <SkyChart spec={spec} />
              </div>
            )
          ) : (
            <div
              style={{
                border: '1px dashed rgba(217,200,160,0.3)',
                borderRadius: 14,
                padding: '110px 20px',
                textAlign: 'center',
                color: 'rgba(244,240,227,0.4)',
                fontFamily: 'var(--mono)',
                fontSize: 13,
                letterSpacing: '0.08em',
              }}
            >
              pick a place above — the sky appears as you build it
            </div>
          )}
          {spec && stats && (
            <div className="facts">
              <span>{stats.stars} stars plotted</span>
              <span>brightest: {stats.brightest}</span>
              <span>{moonFact}</span>
              <span>{planetFact}</span>
            </div>
          )}
        </div>

        <div className="buy-card">
          <div className="price">
            ${((PRICE_CENTS * (form.q || 1)) / 100).toFixed(0)}
            <small>
              {form.q > 1 ? `${form.q} × $${(PRICE_CENTS / 100).toFixed(0)}` : 'one shirt'} · free world shipping
            </small>
          </div>
          <button className="btn btn-big" disabled={!ready || busy} onClick={checkout}>
            {busy ? 'Opening secure checkout…' : `Checkout — ${title ? title.toLowerCase() : ''}`}
          </button>
        </div>
        {error && <div className="checkout-error">{error}</div>}
        <div className="hint" style={{ marginTop: 14, textAlign: 'center' }}>
          secure payment by Stripe · printed &amp; shipped by our print partner within 3–5 days
        </div>
      </div>
    </div>
  )
}
