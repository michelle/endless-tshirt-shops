// Renders one finished t-shirt design as an SVG string.
// The same code runs in the browser (live preview, webfonts) and on the
// server (print file rasterised with @resvg/resvg-js + bundled TTFs).
//
// Canvas: 4680 x 5790 — exactly the recommended front print area of the
// Bella+Canvas 3001 at 300 dpi (15.6" x 19.3").

import { titleFor, dateLine, coordLine, BRAND } from '../spec.js'

const W = 4680
const H = 5790
const CX = W / 2
const CY = 2400
const R = 2080
const DISC = R - 40 // radius stars are plotted within (just inside the ring)

const IVORY = '#f4f0e3'
const GOLD = '#d9c8a0'
const MONO = 'IBM Plex Mono Light'
const CINZEL = 'Cinzel'
const DMSERIF = 'DM Serif Display'

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function starRadius(mag) {
  return Math.max(9, Math.min(96, 8 + (5.5 - mag) * 14.5))
}

// Lit portion of the moon as a single path (works on transparent backgrounds).
function moonPath(cx, cy, r, illum, waxing) {
  const f = Math.max(0.02, Math.min(0.98, illum))
  const e = 1 - 2 * f // terminator semi-axis, signed
  const rx = Math.abs(e) * r
  const top = `${cx},${cy - r}`
  const bottom = `${cx},${cy + r}`
  if (waxing) {
    // right half lit: outer arc right (top->bottom, sweep 1),
    // terminator (bottom->top) bulging toward x = e*r
    const sweep = e >= 0 ? 0 : 1
    return `M ${top} A ${r},${r} 0 0 1 ${bottom} A ${rx},${r} 0 0 ${sweep} ${top} Z`
  }
  // waning: left half lit
  const sweep = e >= 0 ? 1 : 0
  return `M ${top} A ${r},${r} 0 0 0 ${bottom} A ${rx},${r} 0 0 ${sweep} ${top} Z`
}

export function renderDesignSVG(spec, chart, opts = {}) {
  const title = titleFor(spec)
  const date = dateLine(spec)
  const coords = coordLine(spec)
  const dedication = (spec.dg || '').trim()

  const parts = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${
      opts.width ? ` width="${opts.width}" height="${Math.round((opts.width * H) / W)}"` : ''
    }>`
  )

  // ---------- rings & grid ----------
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${GOLD}" stroke-width="14" opacity="0.85"/>` +
      `<circle cx="${CX}" cy="${CY}" r="${R - 46}" fill="none" stroke="${GOLD}" stroke-width="4" opacity="0.5"/>`
  )
  for (const alt of [30, 60]) {
    const r = DISC * (1 - alt / 90)
    parts.push(
      `<circle cx="${CX}" cy="${CY}" r="${r.toFixed(1)}" fill="none" stroke="${IVORY}" stroke-width="3" stroke-dasharray="14 18" opacity="0.14"/>`
    )
  }
  // tick marks every 15 degrees, just outside the ring
  let ticks = ''
  for (let i = 0; i < 24; i++) {
    const a = (i * 15 * Math.PI) / 180
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const r1 = R + 14
    const r2 = R + (i % 6 === 0 ? 52 : 34)
    ticks += `<line x1="${(CX + sin * r1).toFixed(1)}" y1="${(CY - cos * r1).toFixed(1)}" x2="${(CX + sin * r2).toFixed(1)}" y2="${(CY - cos * r2).toFixed(1)}" stroke="${GOLD}" stroke-width="${i % 6 === 0 ? 8 : 5}" opacity="0.55"/>`
  }
  parts.push(`<g>${ticks}</g>`)

  // cardinal points, just inside the ring
  const rCard = DISC - 55
  const cardinals = [
    ['N', CX, CY - rCard],
    ['E', CX + rCard, CY],
    ['S', CX, CY + rCard],
    ['W', CX - rCard, CY],
  ]
  for (const [label, x, y] of cardinals) {
    parts.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${CINZEL}" font-weight="700" font-size="130" fill="${GOLD}" opacity="0.75" text-anchor="middle" dominant-baseline="middle">${label}</text>`
    )
  }

  // ---------- constellation lines ----------
  if (chart.segs.length) {
    let d = ''
    for (const [x1, y1, x2, y2] of chart.segs) {
      d += `M${(CX + x1 * (DISC)).toFixed(1)},${(CY + y1 * (DISC)).toFixed(1)}L${(CX + x2 * (DISC)).toFixed(1)},${(CY + y2 * (DISC)).toFixed(1)}`
    }
    parts.push(`<path d="${d}" stroke="${IVORY}" stroke-width="7" opacity="0.17" fill="none" stroke-linecap="round"/>`)
  }

  // ---------- stars ----------
  let starEls = ''
  for (const s of chart.stars) {
    const x = CX + s.x * (DISC)
    const y = CY + s.y * (DISC)
    const r = starRadius(s.m)
    if (s.m < 2.7) {
      starEls += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 1.85).toFixed(1)}" fill="${s.t}" opacity="0.1"/>`
      starEls += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 1.3).toFixed(1)}" fill="${s.t}" opacity="0.18"/>`
    }
    starEls += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${s.t}"/>`
    if (s.m < 1.0) {
      // diffraction spikes on the very brightest
      const L = r * 2.7
      const sw = Math.max(5, r * 0.16)
      starEls += `<line x1="${(x - L).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + L).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${s.t}" stroke-width="${sw.toFixed(1)}" opacity="0.55"/>`
      starEls += `<line x1="${x.toFixed(1)}" y1="${(y - L).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + L).toFixed(1)}" stroke="${s.t}" stroke-width="${sw.toFixed(1)}" opacity="0.55"/>`
    }
  }
  parts.push(`<g>${starEls}</g>`)

  // ---------- famous star labels ----------
  let labelEls = ''
  for (const l of chart.labels) {
    const x = CX + l.x * (DISC)
    const y = CY + l.y * (DISC)
    labelEls += `<text x="${(x + starRadius(l.m) + 34).toFixed(1)}" y="${(y + 26).toFixed(1)}" font-family="${MONO}" font-size="56" fill="${IVORY}" opacity="0.5">${esc(l.name)}</text>`
  }
  parts.push(`<g>${labelEls}</g>`)

  // ---------- planets ----------
  let planetEls = ''
  for (const p of chart.planets) {
    const x = CX + p.x * (DISC)
    const y = CY + p.y * (DISC)
    planetEls += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(p.r * 1.9).toFixed(1)}" fill="${p.color}" opacity="0.12"/>`
    planetEls += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${p.r}" fill="${p.color}"/>`
    planetEls += `<text x="${(x + p.r + 34).toFixed(1)}" y="${(y + 24).toFixed(1)}" font-family="${MONO}" font-size="62" fill="${p.color}" opacity="0.72">${esc(p.name)}</text>`
  }
  parts.push(`<g>${planetEls}</g>`)

  // ---------- moon ----------
  if (chart.moon) {
    const x = CX + chart.moon.x * (DISC)
    const y = CY + chart.moon.y * (DISC)
    const r = 100
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 1.6).toFixed(1)}" fill="${IVORY}" opacity="0.07"/>`)
    parts.push(
      `<path d="${moonPath(x, y, r, chart.moon.illum, chart.moon.waxing)}" fill="${IVORY}" opacity="0.95"/>`
    )
    parts.push(
      `<text x="${x.toFixed(1)}" y="${(y + r + 84).toFixed(1)}" font-family="${MONO}" font-size="58" fill="${IVORY}" opacity="0.55" text-anchor="middle">MOON</text>`
    )
  }

  // ---------- typography ----------
  // A vertically centred stack between the chart and the footer.
  const titleSize = Math.max(120, Math.min(212, Math.floor(4080 / (title.length * 0.74))))
  const items = [
    {
      s: title,
      y: 0,
      h: titleSize * 0.75,
      el: () =>
        `<text x="${CX}" y="{y}" font-family="${CINZEL}" font-weight="700" font-size="${titleSize}" fill="${IVORY}" text-anchor="middle" letter-spacing="26">{s}</text>`,
    },
  ]
  if (dedication) {
    items.push({
      s: dedication,
      h: 100,
      el: () =>
        `<text x="${CX}" y="{y}" font-family="${DMSERIF}" font-style="italic" font-size="132" fill="${IVORY}" opacity="0.92" text-anchor="middle">{s}</text>`,
    })
  }
  if (date) {
    items.push({
      s: date,
      h: 84,
      el: () =>
        `<text x="${CX}" y="{y}" font-family="${CINZEL}" font-size="112" fill="${IVORY}" opacity="0.8" text-anchor="middle" letter-spacing="16">{s}</text>`,
    })
  }
  if (spec.p) {
    items.push({
      s: spec.p.toUpperCase(),
      h: 72,
      el: () =>
        `<text x="${CX}" y="{y}" font-family="${CINZEL}" font-size="96" fill="${IVORY}" opacity="0.62" text-anchor="middle" letter-spacing="14">{s}</text>`,
    })
  }
  // lay out the stack, centred in the band under the chart
  const bandTop = 4590
  const bandBottom = 5595
  let y = bandTop + items[0].h
  const positions = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    positions.push(y)
    const next = items[i + 1]
    if (next) y += item.h * 0.55 + next.h + (i === 0 && dedication ? 148 : 132)
  }
  const blockTop = bandTop
  const blockBottom = positions[positions.length - 1] + 40
  const offset = (bandTop + bandBottom) / 2 - (blockTop + blockBottom) / 2
  for (let i = 0; i < items.length; i++) {
    const rendered = items[i]
      .el()
      .replace('{y}', Math.round(positions[i] + offset))
      .replace('{s}', esc(items[i].s))
    parts.push(rendered)
  }

  // footer: coordinates + brand, with tiny four-point sparks
  const brand = BRAND.toUpperCase().split('').join(' ')
  const spark = (x, y, s) =>
    `<path d="M${x},${y - s}L${x + s * 0.28},${y - s * 0.28}L${x + s},${y}L${x + s * 0.28},${y + s * 0.28}L${x},${y + s}L${x - s * 0.28},${y + s * 0.28}L${x - s},${y}L${x - s * 0.28},${y - s * 0.28}Z" fill="${GOLD}" opacity="0.9"/>`
  if (coords) {
    parts.push(
      `<text x="${CX}" y="5680" font-family="${MONO}" font-size="80" fill="${GOLD}" opacity="0.72" text-anchor="middle" letter-spacing="8">${esc(coords)} · ${esc(brand)}</text>`
    )
    const halfW = (coords.length + brand.length + 3) * 28 + 170
    parts.push(spark(CX - halfW, 5650, 42))
    parts.push(spark(CX + halfW, 5650, 42))
  }

  parts.push('</svg>')
  return parts.join('')
}

export const DESIGN_W = W
export const DESIGN_H = H
