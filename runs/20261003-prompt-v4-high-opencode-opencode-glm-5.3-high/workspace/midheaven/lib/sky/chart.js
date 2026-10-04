// Builds the geometry of one star chart, in normalized disc coordinates
// (zenith = 0,0; horizon = radius 1; North up, East right).

import stars from './stars.js' // [raDeg, decDeg, mag, bv], sorted by magnitude
import conLines from './lines.js' // [{id, segs: [[ [ra,dec], ... ]]}]
import { FAMOUS } from '../catalog.js'
import { makeProjector, altAzToDisc, solarSystem } from './astro.js'

function tintFor(bv) {
  if (bv === null || bv === undefined) return '#f2efe4'
  const v = parseFloat(bv)
  if (Number.isNaN(v)) return '#f2efe4'
  if (v < 0.15) return '#dde5ff' // hot blue-white
  if (v < 0.6) return '#f2efe4' // ivory white
  return '#ffe9c7' // golden
}

/**
 * @param {Date} date UTC moment
 * @param {number} latDeg latitude of the observer
 * @param {number} lonDeg longitude of the observer
 */
export function buildChart(date, latDeg, lonDeg, opts = {}) {
  const magLimit = opts.magLimit ?? 5.05
  const project = makeProjector(date, latDeg, lonDeg)

  const out = { stars: [], segs: [], labels: [], planets: [], moon: null, stats: {} }

  // --- stars ---
  for (const [ra, dec, mag, bv] of stars) {
    if (mag > magLimit) break
    const { alt, az } = project(ra, dec)
    if (alt <= 0.4) continue
    const pt = altAzToDisc(alt, az)
    if (!pt) continue
    out.stars.push({ x: pt.x, y: pt.y, m: mag, t: tintFor(bv) })
  }

  // --- constellation lines (clipped at the horizon) ---
  for (const con of conLines) {
    for (const seg of con.segs) {
      for (let i = 0; i < seg.length - 1; i++) {
        const a = project(seg[i][0], seg[i][1])
        const b = project(seg[i + 1][0], seg[i + 1][1])
        const aVis = a.alt > 0.4
        const bVis = b.alt > 0.4
        if (aVis && bVis) {
          const pa = altAzToDisc(a.alt, a.az)
          const pb = altAzToDisc(b.alt, b.az)
          if (pa && pb) out.segs.push([pa.x, pa.y, pb.x, pb.y])
        } else if (aVis !== bVis) {
          // clip the segment at the horizon by interpolating altitude
          const t = aVis ? a.alt / (a.alt - b.alt) : b.alt / (b.alt - a.alt)
          const from = aVis ? a : b
          const to = aVis ? b : a
          const altC = 0.4
          const azC = from.az + (to.az - from.az) * t
          const p1 = altAzToDisc(from.alt, from.az)
          const p2 = altAzToDisc(altC, azC)
          if (p1 && p2) out.segs.push([p1.x, p1.y, p2.x, p2.y])
        }
      }
    }
  }

  // --- famous star labels ---
  for (const f of FAMOUS) {
    const { alt, az } = project(f.ra, f.dec)
    if (alt <= 2) continue
    const pt = altAzToDisc(alt, az)
    if (!pt) continue
    out.labels.push({ name: f.name, x: pt.x, y: pt.y, m: f.mag })
  }

  // --- moon & planets ---
  const solar = solarSystem(date, latDeg, lonDeg, project)
  out.moon = solar.moon
  out.moonPhase = solar.moon ? solar.moon : solar.moonPhase || null
  out.planets = solar.planets
  out.belowHorizon = solar.belowHorizon

  // --- narrative stats for the UI ---
  out.stats = {
    stars: out.stars.length,
    constellations: conLines.length,
    brightest: out.labels.length ? out.labels[0].name : null,
    moonPhase: out.moonPhase
      ? { name: out.moonPhase.name, illum: out.moonPhase.illum, waxing: out.moonPhase.waxing }
      : null,
    planets: out.planets.map((p) => p.name),
  }
  return out
}
