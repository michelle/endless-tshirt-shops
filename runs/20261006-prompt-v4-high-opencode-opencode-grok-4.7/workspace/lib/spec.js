import { COLORS, SIZES } from "./products.js"

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const TEXT = /^[\p{L}\p{M}\p{N}\s'’.,&+\-:!?/]{0,48}$/u

export function cleanText(value, max) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

export function normalizeSpec(input) {
  const color = COLORS.some((c) => c.id === input.color) ? input.color : null
  const size = SIZES.some((s) => s.id === input.size) ? input.size : null
  const style = input.style === "quiet" ? "quiet" : input.style === "observatory" ? "observatory" : null
  const names = Array.isArray(input.names)
    ? input.names.map((n) => cleanText(n, 18)).filter(Boolean).slice(0, 3)
    : []
  const lat = Number(input.lat)
  const lng = Number(input.lng)
  const quantity = Math.max(1, Math.min(3, Math.round(Number(input.quantity) || 1)))
  return {
    date: String(input.date || ""),
    time: String(input.time || ""),
    timezone: cleanText(input.timezone, 64),
    lat,
    lng,
    place: cleanText(input.place, 24),
    names,
    inscription: cleanText(input.inscription, 36),
    style,
    color,
    size,
    quantity,
  }
}

export function specErrors(spec) {
  const errors = []
  if (!DATE.test(spec.date)) errors.push("Choose a date.")
  else {
    const year = Number(spec.date.slice(0, 4))
    if (year < 1900 || year > 2099) errors.push("Dates from 1900 to 2099 can be charted.")
  }
  if (!TIME.test(spec.time)) errors.push("Choose a time.")
  if (!spec.timezone || spec.timezone.length < 3) errors.push("Choose a place so we know the time zone.")
  if (!Number.isFinite(spec.lat) || spec.lat < -90 || spec.lat > 90) errors.push("Choose a place on the map.")
  if (!Number.isFinite(spec.lng) || spec.lng < -180 || spec.lng > 180) errors.push("Choose a place on the map.")
  if (!spec.place) errors.push("Give the night a name to print — a city, or your own words.")
  if (!TEXT.test(spec.place)) errors.push("The shirt label has a character we can't print.")
  if (spec.names.length < 1) errors.push("Add at least one name.")
  for (const name of spec.names) {
    if (!TEXT.test(name)) errors.push("A name has a character we can't print.")
  }
  if (spec.inscription && !TEXT.test(spec.inscription)) errors.push("The line has a character we can't print.")
  if (!spec.style) errors.push("Choose a chart style.")
  if (!spec.color) errors.push("Choose a colour.")
  if (!spec.size) errors.push("Choose a size.")
  return errors
}

export function artSpec(spec) {
  return {
    d: spec.date,
    t: spec.time,
    z: spec.timezone,
    la: Math.round(spec.lat * 10000) / 10000,
    ln: Math.round(spec.lng * 10000) / 10000,
    p: spec.place,
    n: spec.names,
    i: spec.inscription,
    s: spec.style,
    c: spec.color,
  }
}

export function specFromArt(art) {
  return normalizeSpec({
    date: art.d,
    time: art.t,
    timezone: art.z,
    lat: art.la,
    lng: art.ln,
    place: art.p,
    names: art.n,
    inscription: art.i,
    style: art.s,
    color: art.c,
    size: "m",
    quantity: 1,
  })
}
