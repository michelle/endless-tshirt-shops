import { normalizeSpec } from "./spec.js"

const META_KEYS = [
  "date",
  "time",
  "timezone",
  "lat",
  "lng",
  "place",
  "names",
  "inscription",
  "style",
  "color",
  "size",
  "quantity",
  "shipping_method",
  "email",
  "ship_name",
  "ship_line1",
  "ship_line2",
  "ship_city",
  "ship_state",
  "ship_postal",
  "ship_country",
  "ship_phone",
]

export function metadataFor(spec, shipping, contact) {
  const names = spec.names.join(" | ")
  const meta = {
    source: "vesper",
    date: spec.date,
    time: spec.time,
    timezone: spec.timezone,
    lat: String(spec.lat),
    lng: String(spec.lng),
    place: spec.place,
    names,
    inscription: spec.inscription || "",
    style: spec.style,
    color: spec.color,
    size: spec.size,
    quantity: String(spec.quantity),
    shipping_method: shipping.method,
    email: contact.email,
    ship_name: shipping.name,
    ship_line1: shipping.line1,
    ship_line2: shipping.line2 || "",
    ship_city: shipping.city,
    ship_state: shipping.state || "",
    ship_postal: shipping.postal,
    ship_country: shipping.country,
    ship_phone: contact.phone,
  }
  for (const [key, value] of Object.entries(meta)) {
    if (String(value).length > 490) {
      throw new Error(`Order detail “${key}” is too long to store.`)
    }
  }
  return meta
}

export function specFromMetadata(meta) {
  return normalizeSpec({
    date: meta.date,
    time: meta.time,
    timezone: meta.timezone,
    lat: meta.lat,
    lng: meta.lng,
    place: meta.place,
    names: String(meta.names || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean),
    inscription: meta.inscription,
    style: meta.style,
    color: meta.color,
    size: meta.size,
    quantity: meta.quantity,
  })
}

export { META_KEYS }
