'use client'

import { useEffect, useRef, useState } from 'react'

export default function PlaceSearch({ onSelect, selected }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        setResults(data.results || [])
        setActive(0)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 180)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function pick(place) {
    onSelect(place)
    setOpen(false)
    setResults([])
    setQuery(place.label.split(',')[0])
  }

  function onKeyDown(e) {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="place-search" ref={boxRef}>
      <div className="field" style={{ marginBottom: 0 }}>
        <input
          type="search"
          value={query}
          placeholder={selected ? selected.label : 'Search any city or town…'}
          onChange={(e) => {
            setQuery(e.target.value)
            if (selected) onSelect(null)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => results.length && setOpen(true)}
          autoComplete="off"
        />
      </div>
      {open && results.length > 0 && (
        <div className="place-results">
          {results.map((r, i) => (
            <div
              key={`${r.name}-${r.cc}-${r.lat}-${r.lon}`}
              className="place-result"
              style={i === active ? { background: 'rgba(217,200,160,0.08)' } : undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(r)}
            >
              <span>
                {r.name}
                {r.admin ? `, ${r.admin}` : ''}, {r.country}
              </span>
              <span className="pr-geo">
                {r.lat.toFixed(2)}°{r.lat >= 0 ? 'N' : 'S'} {Math.abs(r.lon).toFixed(2)}°
                {r.lon >= 0 ? 'E' : 'W'}
              </span>
            </div>
          ))}
        </div>
      )}
      {loading && <div className="hint" style={{ marginTop: 8 }}>searching…</div>}
      {selected && (
        <div className="place-selected">
          ✶ {selected.label} <span className="tz">· {selected.tz}</span>
        </div>
      )}
    </div>
  )
}
