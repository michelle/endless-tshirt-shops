// Design spec: the full definition of one customer's shirt.
// Kept intentionally tiny so it can round-trip through Stripe metadata
// and through a URL-safe base64 "design id" used by the print endpoint.

export const BRAND = 'Midheaven'
export const BRAND_TAGLINE = 'The sky, the night it all began.'

export const PRODUCT = {
  sku: 'GLOBAL-TEE-BC-3001',
  name: 'Custom Night-Sky Tee',
  blank: 'Bella+Canvas 3001',
  printArea: 'front',
}

export const PRICE_CENTS = 3900
export const CURRENCY = 'usd'

// Curated dark colours — the ivory-on-dark chart reads beautifully on all of them.
export const COLORS = [
  { id: 'black', label: 'Black', hex: '#1a1a1d' },
  { id: 'navy blue', label: 'Navy', hex: '#1e2a47' },
  { id: 'asphalt', label: 'Asphalt', hex: '#4c5257' },
  { id: 'army', label: 'Army', hex: '#4a5340' },
  { id: 'burgundy', label: 'Burgundy', hex: '#57262e' },
  { id: 'dark heather grey', label: 'Dark Heather', hex: '#43464b' },
]

export const SIZES = [
  { id: 'xs', label: 'XS', chest: '31–34"' },
  { id: 's', label: 'S', chest: '34–37"' },
  { id: 'm', label: 'M', chest: '38–41"' },
  { id: 'l', label: 'L', chest: '42–45"' },
  { id: 'xl', label: 'XL', chest: '46–49"' },
  { id: '2xl', label: '2XL', chest: '50–53"' },
  { id: '3xl', label: '3XL', chest: '54–57"' },
  { id: '4xl', label: '4XL', chest: '58–61"' },
]

export const TITLE_PRESETS = [
  { id: 'born', label: 'The night you were born', text: 'THE NIGHT YOU WERE BORN' },
  { id: 'met', label: 'The night you met', text: 'THE NIGHT WE MET' },
  { id: 'married', label: 'The night you married', text: 'THE NIGHT WE MARRIED' },
  { id: 'arrived', label: 'The night they arrived', text: 'THE NIGHT YOU ARRIVED' },
  { id: 'custom', label: 'Your own words', text: '' },
]

export const ALLOWED_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'FR', 'DE', 'AT', 'BE', 'NL', 'LU', 'ES', 'PT', 'IT',
  'CH', 'LI', 'DK', 'NO', 'SE', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR',
  'EE', 'LV', 'LT', 'GR', 'CY', 'MT', 'BG', 'RO', 'AU', 'NZ', 'JP', 'SG', 'HK',
  'KR', 'NO', 'AE', 'SA', 'QA', 'IL', 'MX', 'BR',
]

// ---------- helpers ----------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function titleFor(spec) {
  if (spec.t === 'custom') return (spec.ti || '').toUpperCase().slice(0, 34)
  const preset = TITLE_PRESETS.find((p) => p.id === spec.t)
  return preset ? preset.text : TITLE_PRESETS[0].text
}

export function dateLine(spec) {
  const [y, m, d] = (spec.d || '').split('-').map(Number)
  if (!y || !m || !d) return ''
  const month = MONTHS[m - 1] || ''
  return `${month.toUpperCase()} ${d} ${y} · ${spec.tm}`
}

export function coordLine(spec) {
  if (typeof spec.la !== 'number' || typeof spec.lo !== 'number') return ''
  const lat = `${Math.abs(spec.la).toFixed(4)}° ${spec.la >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(spec.lo).toFixed(4)}° ${spec.lo >= 0 ? 'E' : 'W'}`
  return `${lat} / ${lon}`
}

// ---------- validation ----------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function validateSpec(input) {
  if (!input || typeof input !== 'object') return null
  const s = {}
  const t = TITLE_PRESETS.find((p) => p.id === input.t)
  s.t = t ? input.t : 'born'
  s.ti = typeof input.ti === 'string' ? input.ti.slice(0, 40) : ''
  if (s.t === 'custom' && !s.ti.trim()) return null

  if (!DATE_RE.test(input.d || '')) return null
  const year = Number(input.d.slice(0, 4))
  if (year < 1925 || year > 2035) return null
  s.d = input.d
  if (!TIME_RE.test(input.tm || '')) return null
  s.tm = input.tm

  if (typeof input.la !== 'number' || Math.abs(input.la) > 85) return null
  if (typeof input.lo !== 'number' || Math.abs(input.lo) > 180) return null
  s.la = Math.round(input.la * 10000) / 10000
  s.lo = Math.round(input.lo * 10000) / 10000
  s.p = typeof input.p === 'string' ? input.p.slice(0, 60) : ''
  s.tz = typeof input.tz === 'string' ? input.tz.slice(0, 64) : 'UTC'

  s.dg = typeof input.dg === 'string' ? input.dg.slice(0, 46) : ''

  const color = COLORS.find((c) => c.id === input.c)
  s.c = color ? color.id : 'black'
  const size = SIZES.find((z) => z.id === input.s)
  s.s = size ? size.id : 'm'
  const q = Number(input.q)
  s.q = Number.isInteger(q) && q >= 1 && q <= 3 ? q : 1

  return s
}

// ---------- base64url design id ----------

export function encodeSpec(spec) {
  const json = JSON.stringify(spec)
  if (typeof window === 'undefined') {
    return Buffer.from(json, 'utf8').toString('base64url')
  }
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSpec(id) {
  try {
    if (typeof id !== 'string' || !id.length || id.length > 2048) return null
    let json
    if (typeof window === 'undefined') {
      json = Buffer.from(id, 'base64url').toString('utf8')
    } else {
      const b64 = id.replace(/-/g, '+').replace(/_/g, '/')
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      json = new TextDecoder().decode(bytes)
    }
    return validateSpec(JSON.parse(json))
  } catch {
    return null
  }
}
