"use client"

import { useEffect, useMemo, useState } from "react"
import { shirtSvg, printSvg, describeSky } from "../lib/artwork.js"
import {
  COLORS,
  SIZES,
  SAMPLE,
  NIGHTS,
  COUNTRIES,
  regionsFor,
  colorById,
} from "../lib/products.js"
import { isDaytime, money } from "../lib/format.js"

const EMPTY_SHIPPING = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal: "",
  country: "US",
  method: "Standard",
}

export default function Store() {
  const [spec, setSpec] = useState({ ...SAMPLE })
  const [labelTouched, setLabelTouched] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [view, setView] = useState("shirt")
  const [shipping, setShipping] = useState(EMPTY_SHIPPING)
  const [contact, setContact] = useState({ email: "", phone: "" })
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState("")
  const [payError, setPayError] = useState("")
  const [paying, setPaying] = useState(false)
  const [canceled, setCanceled] = useState(false)

  useEffect(() => {
    setCanceled(new URLSearchParams(window.location.search).get("canceled") === "1")
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const handle = setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`)
        const data = await response.json()
        setResults(data.results || [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 280)
    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    const handle = setTimeout(async () => {
      setQuoteError("")
      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: shipping.country,
            size: spec.size,
            color: spec.color,
            quantity: spec.quantity,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          setQuote(null)
          setQuoteError(data.error || "Couldn't price shipping.")
          return
        }
        setQuote(data)
        if (!data.methods.some((method) => method.id === shipping.method && method.available)) {
          const fallback = data.methods.find((method) => method.available)
          if (fallback) setShipping((prev) => ({ ...prev, method: fallback.id }))
        }
      } catch {
        setQuoteError("Couldn't reach the shipping quote.")
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [shipping.country, shipping.method, spec.size, spec.color, spec.quantity])

  const sky = useMemo(() => {
    try {
      return describeSky(spec)
    } catch {
      return null
    }
  }, [spec])

  const preview = useMemo(() => {
    try {
      return view === "shirt" ? shirtSvg(spec, { width: 640 }) : printSvg(spec)
    } catch {
      return ""
    }
  }, [spec, view])

  const selected = quote?.methods?.find((method) => method.id === shipping.method && method.available)
  const regions = regionsFor(shipping.country)

  function applyNight(night) {
    setSpec((prev) => ({
      ...prev,
      date: night.date,
      time: night.time,
      timezone: night.timezone,
      lat: night.lat,
      lng: night.lng,
      place: night.place,
      names: night.names,
      inscription: night.inscription,
    }))
    setLabelTouched(false)
    setQuery("")
    setResults([])
  }

  function choosePlace(place) {
    setSpec((prev) => ({
      ...prev,
      lat: place.lat,
      lng: place.lng,
      timezone: place.timezone,
      place: labelTouched ? prev.place : place.name.slice(0, 24),
    }))
    setQuery("")
    setResults([])
  }

  function setName(index, value) {
    setSpec((prev) => {
      const names = [...prev.names]
      names[index] = value
      return { ...prev, names }
    })
  }

  async function pay(event) {
    event.preventDefault()
    setPayError("")
    setPaying(true)
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...spec,
          shipping,
          contact,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.url) {
        setPayError(data.error || "Payment couldn't be started.")
        setPaying(false)
        return
      }
      window.location.href = data.url
    } catch {
      setPayError("Payment couldn't be started.")
      setPaying(false)
    }
  }

  const color = colorById(spec.color)

  return (
    <div className="studio" id="chart">
      <form className="order" onSubmit={pay}>
        <section className="block">
          <h2>The night</h2>
          <p className="hint">Local time, at the place. Evening hours make a richer chart.</p>
          <div className="nights">
            {NIGHTS.map((night) => (
              <button
                key={night.kicker}
                type="button"
                className="night"
                onClick={() => applyNight(night)}
              >
                <b>{night.kicker}</b>
                <span>{night.detail}</span>
              </button>
            ))}
          </div>
          <div className="grid-2">
            <label className="field">
              Date
              <input
                type="date"
                required
                min="1900-01-01"
                max="2099-12-31"
                value={spec.date}
                onChange={(e) => setSpec({ ...spec, date: e.target.value })}
              />
            </label>
            <label className="field">
              Local time
              <input
                type="time"
                required
                value={spec.time}
                onChange={(e) => setSpec({ ...spec, time: e.target.value })}
              />
            </label>
          </div>
          <label className="field" style={{ marginTop: 14 }}>
            Place
            <input
              type="search"
              placeholder="Search a city"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </label>
          {searching && <p className="note">Looking up places…</p>}
          {results.length > 0 && (
            <ul className="results">
              {results.map((place) => (
                <li key={`${place.lat}-${place.lng}-${place.name}`}>
                  <button type="button" onClick={() => choosePlace(place)}>
                    {place.name}
                    {place.admin1 ? `, ${place.admin1}` : ""}
                    {place.country ? ` · ${place.country}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="chosen">
            Charted for {spec.place || "—"} · {spec.lat.toFixed(2)}°, {spec.lng.toFixed(2)}°
            {sky ? ` · ${sky.visible} stars above the horizon · sidereal ${sky.sidereal}` : ""}
          </p>
          {isDaytime(spec.time) && (
            <p className="warn">This is a daytime sky. The stars were up, just outshone. Night hours make a shirt people actually wear.</p>
          )}
          <label className="field" style={{ marginTop: 14 }}>
            Words on the shirt
            <input
              maxLength={24}
              value={spec.place}
              onChange={(e) => {
                setLabelTouched(true)
                setSpec({ ...spec, place: e.target.value })
              }}
              required
            />
          </label>
        </section>

        <section className="block">
          <h2>Who was there</h2>
          <p className="hint">One to three names, and a short line if you want one.</p>
          <div className="grid-3">
            {[0, 1, 2].map((index) => (
              <label className="field" key={index}>
                {index === 0 ? "Name" : `Name ${index + 1}`}
                <input
                  maxLength={18}
                  required={index === 0}
                  value={spec.names[index] || ""}
                  onChange={(e) => setName(index, e.target.value)}
                />
              </label>
            ))}
          </div>
          <label className="field" style={{ marginTop: 14 }}>
            A line, optional
            <input
              maxLength={36}
              placeholder="the night we met"
              value={spec.inscription}
              onChange={(e) => setSpec({ ...spec, inscription: e.target.value })}
            />
          </label>
          <div className="choices" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="choice"
              aria-pressed={spec.style === "observatory"}
              onClick={() => setSpec({ ...spec, style: "observatory" })}
            >
              <b>Observatory</b>
              <span>Constellation lines, and a copper ring on the brightest stars.</span>
            </button>
            <button
              type="button"
              className="choice"
              aria-pressed={spec.style === "quiet"}
              onClick={() => setSpec({ ...spec, style: "quiet" })}
            >
              <b>Quiet</b>
              <span>Stars only. Easier to wear on a Tuesday.</span>
            </button>
          </div>
        </section>

        <section className="block">
          <h2>The shirt</h2>
          <p className="hint">{color.label}. Ink is chosen for contrast, and it never prints a solid background.</p>
          <div className="swatches" role="listbox" aria-label="Colour">
            {COLORS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="swatch"
                aria-pressed={spec.color === item.id}
                aria-label={item.label}
                title={item.label}
                style={{ background: item.hex }}
                onClick={() => setSpec({ ...spec, color: item.id })}
              />
            ))}
          </div>
          <div className="sizes" style={{ marginTop: 16 }}>
            {SIZES.map((size) => (
              <button
                key={size.id}
                type="button"
                className="size"
                aria-pressed={spec.size === size.id}
                onClick={() => setSpec({ ...spec, size: size.id })}
              >
                {size.label}
              </button>
            ))}
          </div>
          <div className="qty" style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setSpec({ ...spec, quantity: Math.max(1, spec.quantity - 1) })}
              aria-label="Fewer"
            >
              −
            </button>
            <span>{spec.quantity}</span>
            <button
              type="button"
              onClick={() => setSpec({ ...spec, quantity: Math.min(3, spec.quantity + 1) })}
              aria-label="More"
            >
              +
            </button>
          </div>
        </section>

        <section className="block">
          <h2>Where it goes</h2>
          <p className="hint">We quote shipping before you pay. The shirt is not sent to print until the payment succeeds.</p>
          <div className="grid-2">
            <label className="field">
              Recipient
              <input required value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} />
            </label>
            <label className="field">
              Email
              <input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            </label>
            <label className="field">
              Phone
              <input required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            </label>
            <label className="field">
              Country
              <select
                value={shipping.country}
                onChange={(e) => setShipping({ ...shipping, country: e.target.value, state: "" })}
              >
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Address
              <input required value={shipping.line1} onChange={(e) => setShipping({ ...shipping, line1: e.target.value })} />
            </label>
            <label className="field">
              Address line 2
              <input value={shipping.line2} onChange={(e) => setShipping({ ...shipping, line2: e.target.value })} />
            </label>
            <label className="field">
              City
              <input required value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} />
            </label>
            {regions ? (
              <label className="field">
                State
                <select required value={shipping.state} onChange={(e) => setShipping({ ...shipping, state: e.target.value })}>
                  <option value="">Select</option>
                  {regions.map(([code, name]) => (
                    <option key={code} value={name}>{name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                Region
                <input value={shipping.state} onChange={(e) => setShipping({ ...shipping, state: e.target.value })} />
              </label>
            )}
            <label className="field">
              Postal code
              <input required value={shipping.postal} onChange={(e) => setShipping({ ...shipping, postal: e.target.value })} />
            </label>
          </div>
          <div className="choices" style={{ marginTop: 16 }}>
            {(quote?.methods || []).map((method) => (
              <button
                key={method.id}
                type="button"
                className="choice"
                disabled={!method.available}
                aria-pressed={shipping.method === method.id}
                onClick={() => method.available && setShipping({ ...shipping, method: method.id })}
              >
                <b>{method.label}{method.available ? ` · ${money(method.shipping)}` : ""}</b>
                <span>{method.available ? method.hint : "Not available here"}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="summary">
          <div><span>Shirt × {spec.quantity}</span><span>{selected ? money(selected.garment * spec.quantity) : "—"}</span></div>
          <div><span>Shipping</span><span>{selected ? money(selected.shipping) : "—"}</span></div>
          <div className="total"><span>Total</span><span>{selected ? money(selected.total) : "—"}</span></div>
        </div>
        {canceled && <p className="warn">Payment canceled. Nothing was sent to print.</p>}
        {quoteError && <p className="error">{quoteError}</p>}
        {payError && <p className="error">{payError}</p>}
        <button className="pay" type="submit" disabled={paying || !selected}>
          {paying ? "Opening secure checkout…" : selected ? `Pay ${money(selected.total)}` : "Shipping unavailable"}
        </button>
        <p className="note">You’ll pay on Stripe. We create the print order only after the payment is marked paid. USD, tax not collected on this sandbox.</p>
      </form>

      <aside className="stage">
        <div className="stage-bar">
          <p>{view === "shirt" ? "On the shirt" : "Print file"}</p>
          <div className="toggles">
            <button type="button" aria-pressed={view === "shirt"} onClick={() => setView("shirt")}>Shirt</button>
            <button type="button" aria-pressed={view === "proof"} onClick={() => setView("proof")}>Proof</button>
          </div>
        </div>
        {view === "shirt" ? (
          <div className="shirt-frame" dangerouslySetInnerHTML={{ __html: preview }} />
        ) : (
          <div className="proof-frame" style={{ background: color.hex }}>
            <div className="sheet" dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        )}
        <p className="caption">
          {view === "shirt"
            ? "The chart is placed on the chest print area, not stretched edge to edge. What you see is the file, scaled onto the blank."
            : "Transparent ink on the shirt colour. No white panel. This is the file Prodigi receives."}
        </p>
      </aside>
    </div>
  )
}
