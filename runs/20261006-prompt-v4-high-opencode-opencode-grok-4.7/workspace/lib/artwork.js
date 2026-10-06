import catalog from "./catalog.json" with { type: "json" }
import { project, zonedTimeToUtc, localSiderealDegrees, formatSidereal } from "./astronomy.js"
import { PRINT, inkFor, colorById, shade } from "./products.js"
import { esc, formatShirtDate, joinNames, formatCoords } from "./format.js"

/**
 * Print file for the Gildan 64000 front.
 *
 * The canvas matches Prodigi's larger print area (4665×5844, about 15.6×19.3 in
 * at 300 dpi) so fillPrintArea does not crop on the US/global lab. Content sits
 * in a wide center band so the taller EU print area, which crops the sides,
 * still keeps the chart. Everything drawn is opaque. The background is
 * transparent so the shirt colour is the background — no white box, no
 * underbase slab. Strokes are at least ~0.8 mm so they hold in DTG.
 */

const CX = PRINT.width / 2
const CY = 1760
const OUTER = 1140
const INNER = 1060
const HORIZON = 1008

const FONT = "Libre Baskerville"

function skyContext(spec) {
  const when = zonedTimeToUtc(spec.date, spec.time, spec.timezone)
  const lst = localSiderealDegrees(when, spec.lng)
  return { when, lst }
}

function starRadius(mag) {
  const t = Math.max(0, Math.min(1, (4.5 - mag) / 6))
  return 7 + t ** 1.4 * 15
}

export function describeSky(spec) {
  const { lst } = skyContext(spec)
  let visible = 0
  for (const star of catalog.stars) {
    if (project(star[0], star[1], spec.lat, lst, CX, CY, HORIZON)) visible += 1
  }
  return { lst, sidereal: formatSidereal(lst), visible }
}

function chartMarkup(spec) {
  const ink = inkFor(spec.color)
  const { lst } = skyContext(spec)
  const parts = []

  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${OUTER}" fill="none" stroke="${ink.text}" stroke-width="16"/>`
  )
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${INNER}" fill="none" stroke="${ink.muted}" stroke-width="8"/>`
  )

  for (let deg = 0; deg < 360; deg += 10) {
    const major = deg % 30 === 0
    const a = (deg * Math.PI) / 180
    const r0 = major ? INNER - 8 : INNER + 6
    const r1 = OUTER - 8
    const x0 = CX + r0 * Math.sin(a)
    const y0 = CY - r0 * Math.cos(a)
    const x1 = CX + r1 * Math.sin(a)
    const y1 = CY - r1 * Math.cos(a)
    parts.push(
      `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${ink.text}" stroke-width="${major ? 12 : 8}" stroke-linecap="butt"/>`
    )
  }

  const cards = [
    ["N", 0],
    ["E", 90],
    ["S", 180],
    ["W", 270],
  ]
  for (const [letter, deg] of cards) {
    const a = (deg * Math.PI) / 180
    const r = OUTER + 62
    const x = CX + r * Math.sin(a)
    const y = CY - r * Math.cos(a)
    parts.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-weight="700" font-size="72" fill="${ink.text}">${letter}</text>`
    )
  }

  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="16" fill="none" stroke="${ink.copper}" stroke-width="10"/>`
  )

  if (spec.style !== "quiet") {
    for (const seg of catalog.lines) {
      const a = project(seg[0][0], seg[0][1], spec.lat, lst, CX, CY, HORIZON)
      const b = project(seg[1][0], seg[1][1], spec.lat, lst, CX, CY, HORIZON)
      if (!a || !b) continue
      parts.push(
        `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${ink.line}" stroke-width="9" stroke-linecap="round"/>`
      )
    }
  }

  const drawn = []
  for (const star of catalog.stars) {
    const p = project(star[0], star[1], spec.lat, lst, CX, CY, HORIZON)
    if (!p) continue
    drawn.push({ mag: star[2], name: star[3], ...p })
  }
  drawn.sort((a, b) => b.mag - a.mag)
  for (const star of drawn) {
    const r = starRadius(star.mag)
    parts.push(
      `<circle cx="${star.x.toFixed(1)}" cy="${star.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${ink.star}"/>`
    )
  }
  if (spec.style !== "quiet") {
    const marked = drawn.filter((s) => s.mag < 0.9).sort((a, b) => a.mag - b.mag).slice(0, 3)
    for (const star of marked) {
      const r = starRadius(star.mag) + 12
      parts.push(
        `<circle cx="${star.x.toFixed(1)}" cy="${star.y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${ink.copper}" stroke-width="8"/>`
      )
    }
  }

  const lines = []
  const dateLine = formatShirtDate(spec.date, spec.time)
  if (dateLine) lines.push({ text: dateLine, size: 54, weight: 700, fill: ink.text, gap: 36, tracking: 6 })
  const place = String(spec.place || "").trim()
  if (place) {
    const size = place.length > 16 ? 150 : place.length > 12 ? 176 : 210
    lines.push({ text: place, size, weight: 700, fill: ink.text, gap: 18, tracking: 0 })
  }
  const names = joinNames(spec.names)
  if (names) lines.push({ text: names, size: 118, weight: 400, style: "italic", fill: ink.text, gap: 14, tracking: 0 })
  const inscription = String(spec.inscription || "").trim()
  if (inscription) lines.push({ text: inscription, size: 92, weight: 400, style: "italic", fill: ink.copper, gap: 36, tracking: 0 })
  lines.push({
    text: formatCoords(spec.lat, spec.lng),
    size: 48,
    weight: 700,
    fill: ink.muted,
    gap: 48,
    tracking: 3,
  })
  lines.push({ text: "VESPER", size: 56, weight: 700, fill: ink.text, gap: 0, tracking: 18 })

  let y = CY + OUTER + 118
  for (const line of lines) {
    y += line.size * 0.82
    const style = line.style ? ` font-style="${line.style}"` : ""
    const tracking = line.tracking ? ` letter-spacing="${line.tracking}"` : ""
    parts.push(
      `<text x="${CX}" y="${y.toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-weight="${line.weight}" font-size="${line.size}" fill="${line.fill}"${style}${tracking}>${esc(line.text)}</text>`
    )
    y += line.gap
  }

  return parts.join("")
}

export function printSvg(spec) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT.width}" height="${PRINT.height}" viewBox="0 0 ${PRINT.width} ${PRINT.height}">
  ${chartMarkup(spec)}
</svg>`
}

/** Shirt mockup with the print canvas mapped onto the real print area. */
export function shirtSvg(spec, { width = 640 } = {}) {
  const color = colorById(spec.color)
  const hex = color.hex
  const edge = shade(hex, luminanceEdge(hex))
  // Medium shirt is 20 in wide × 29 in long. Print area is 15.6 × 19.3 in,
  // centered, starting about 2.2 in below the shoulder seam.
  const vbW = 480
  const vbH = 600
  const bodyW = 228
  const bodyH = bodyW / (20 / 29)
  const bodyX = (vbW - bodyW) / 2
  const bodyY = 168
  const printW = bodyW * (15.6 / 20)
  const printH = bodyH * (19.3 / 29)
  const printX = bodyX + (bodyW - printW) / 2
  const printY = bodyY + bodyH * (2.2 / 29)

  const shirt = shirtPath()
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(width * (vbH / vbW))}" viewBox="0 0 ${vbW} ${vbH}">
  <path d="${shirt}" fill="${hex}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  <svg x="${printX.toFixed(2)}" y="${printY.toFixed(2)}" width="${printW.toFixed(2)}" height="${printH.toFixed(2)}" viewBox="0 0 ${PRINT.width} ${PRINT.height}">
    ${chartMarkup(spec)}
  </svg>
</svg>`
}

function hexIsLight(hex) {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

function luminanceEdge(hex) {
  return hexIsLight(hex) ? -0.12 : 0.14
}

function shirtPath() {
  // Crew neck, set-in sleeves, straight tubular body. One closed outline.
  return [
    "M172 118",
    "C198 146, 282 146, 308 118",
    "L356 132",
    "L432 186",
    "L396 224",
    "L344 190",
    "L344 506",
    "Q240 524, 136 506",
    "L136 190",
    "L84 224",
    "L48 186",
    "L124 132",
    "Z",
  ].join(" ")
}

export function fontFiles() {
  return [
    "public/fonts/LibreBaskerville-Regular.ttf",
    "public/fonts/LibreBaskerville-Bold.ttf",
    "public/fonts/LibreBaskerville-Italic.ttf",
  ]
}
