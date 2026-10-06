const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function formatLongDate(iso) {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function formatShirtDate(iso, time) {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return ""
  return `${d} ${MONTHS[m - 1].toUpperCase()} ${y}   ·   ${time}`
}

export function joinNames(names) {
  const n = (names || []).map((s) => String(s).trim()).filter(Boolean)
  if (n.length === 0) return ""
  if (n.length === 1) return n[0]
  if (n.length === 2) return `${n[0]} & ${n[1]}`
  return `${n.slice(0, -1).join(", ")} & ${n[n.length - 1]}`
}

export function formatCoords(lat, lng) {
  const ns = lat >= 0 ? "N" : "S"
  const ew = lng >= 0 ? "E" : "W"
  return `${Math.abs(lat).toFixed(2)}° ${ns}    ·    ${Math.abs(lng).toFixed(2)}° ${ew}`
}

export function money(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function isDaytime(time) {
  const h = Number(String(time).split(":")[0])
  return h >= 6 && h < 18
}
