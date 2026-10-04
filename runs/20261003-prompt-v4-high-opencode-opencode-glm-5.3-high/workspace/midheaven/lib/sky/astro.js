// Isomorphic astronomy helpers.
// Star positions are computed with plain spherical trigonometry for speed;
// astronomy-engine is used for sidereal time, the Moon and the planets.

import * as Astronomy from 'astronomy-engine'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

/**
 * Convert a local wall-clock date/time in a given IANA timezone to a UTC Date.
 * Uses the two-pass Intl trick; falls back to UTC for invalid zones.
 */
export function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  const naive = Date.UTC(y, mo - 1, d, hh, mm)

  function offsetOf(ms) {
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      const parts = {}
      for (const p of dtf.formatToParts(new Date(ms))) parts[p.type] = p.value
      const asUtc = Date.UTC(
        +parts.year,
        +parts.month - 1,
        +parts.day,
        +parts.hour % 24,
        +parts.minute
      )
      return asUtc - ms // offset: local + offset = utc
    } catch {
      return 0
    }
  }

  let offset = offsetOf(naive)
  let utc = naive - offset
  offset = offsetOf(utc)
  utc = naive - offset
  return new Date(utc)
}

/**
 * Build a projector function: (raDeg, decDeg) -> { alt, az } in degrees.
 * az is measured from North through East.
 */
export function makeProjector(date, latDeg, lonDeg) {
  const gast = Astronomy.SiderealTime(date) // Greenwich sidereal time, hours
  const lstDeg = (((gast * 15 + lonDeg) % 360) + 360) % 360
  const lst = lstDeg * D2R
  const lat = latDeg * D2R
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)

  return function project(raDeg, decDeg) {
    const ha = lst - raDeg * D2R
    const dec = decDeg * D2R
    const sinDec = Math.sin(dec)
    const cosDec = Math.cos(dec)
    const sinAlt = sinDec * sinLat + cosDec * cosLat * Math.cos(ha)
    // y = cos(alt)·sin(az), x = cos(alt)·cos(az)  (az from north, eastward)
    const y = -cosDec * Math.sin(ha)
    const x = sinDec * cosLat - cosDec * sinLat * Math.cos(ha)
    return {
      alt: Math.asin(Math.max(-1, Math.min(1, sinAlt))) * R2D,
      az: (Math.atan2(y, x) * R2D + 360) % 360,
    }
  }
}

/**
 * Map alt/az onto the unit disc of an all-sky chart:
 * zenith at centre, horizon at radius 1, North up, East right
 * (the view you get lying on your back with your head pointing north).
 */
export function altAzToDisc(alt, az) {
  const r = (90 - alt) / 90
  if (r < 0 || r > 1) return null
  const a = az * D2R
  return { x: Math.sin(a) * r, y: -Math.cos(a) * r }
}

const PLANETS = [
  { name: 'Mercury', body: Astronomy.Body.Mercury, color: '#d7d7d2', r: 26 },
  { name: 'Venus', body: Astronomy.Body.Venus, color: '#f7f3dd', r: 40 },
  { name: 'Mars', body: Astronomy.Body.Mars, color: '#e8b49b', r: 30 },
  { name: 'Jupiter', body: Astronomy.Body.Jupiter, color: '#f0e7cd', r: 38 },
  { name: 'Saturn', body: Astronomy.Body.Saturn, color: '#e7dab6', r: 34 },
]

/**
 * Positions of the Moon and bright planets for an observer.
 * Returns disc coordinates plus display info; bodies below the horizon
 * are omitted from positions but reported in `below`.
 */
export function solarSystem(date, latDeg, lonDeg, project) {
  const observer = new Astronomy.Observer(latDeg, lonDeg, 0)
  const result = { moon: null, planets: [], belowHorizon: [] }

  // Moon
  try {
    const eq = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true)
    const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec)
    const ill = Astronomy.Illumination(Astronomy.Body.Moon, date)
    const angle = Astronomy.MoonPhase(date) // 0 new .. 180 full .. 360 new
    const info = {
      illum: Math.max(0, Math.min(1, ill.phase_fraction)),
      waxing: angle > 0 && angle < 180,
      angle,
      name: moonPhaseName(angle),
    }
    if (hor.altitude > 0) {
      const pt = altAzToDisc(hor.altitude, hor.azimuth)
      if (pt) result.moon = { x: pt.x, y: pt.y, ...info }
      else result.belowHorizon.push('Moon')
    } else {
      result.belowHorizon.push('Moon')
      result.moonPhase = info
    }
  } catch {
    /* ignore */
  }

  // Planets
  for (const p of PLANETS) {
    try {
      const eq = Astronomy.Equator(p.body, date, observer, true, true)
      const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec)
      if (hor.altitude > 0) {
        const pt = altAzToDisc(hor.altitude, hor.azimuth)
        if (pt) result.planets.push({ name: p.name, color: p.color, r: p.r, x: pt.x, y: pt.y })
      } else {
        result.belowHorizon.push(p.name)
      }
    } catch {
      /* ignore */
  }
  }
  return result
}

export function moonPhaseName(angle) {
  const names = [
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous',
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent',
  ]
  const idx = Math.floor(((angle + 22.5) % 360) / 45)
  return names[idx]
}
