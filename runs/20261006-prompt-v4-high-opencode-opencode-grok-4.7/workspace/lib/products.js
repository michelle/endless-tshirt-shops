export const SKU = "GLOBAL-TEE-GIL-64000"
export const PRINT = { width: 4665, height: 5844 }

/** Curated colours of the Gildan 64000. ids must match Prodigi attributes exactly. */
export const COLORS = [
  { id: "black", label: "Black", hex: "#161616" },
  { id: "navy blue", label: "Navy", hex: "#1b2744" },
  { id: "forest green", label: "Forest", hex: "#1c3a2c" },
  { id: "maroon", label: "Maroon", hex: "#6a2c38" },
  { id: "white", label: "White", hex: "#f6f4f1" },
  { id: "sand", label: "Sand", hex: "#d8c5a4" },
  { id: "natural", label: "Natural", hex: "#f0e6d2" },
  { id: "light blue", label: "Light blue", hex: "#b5d0de" },
]

export const SIZES = [
  { id: "xs", label: "XS", fit: "30–32", flat: "16 × 27" },
  { id: "s", label: "S", fit: "34–36", flat: "18 × 28" },
  { id: "m", label: "M", fit: "38–40", flat: "20 × 29" },
  { id: "l", label: "L", fit: "42–44", flat: "22 × 30" },
  { id: "xl", label: "XL", fit: "46–48", flat: "24 × 31" },
  { id: "2xl", label: "2XL", fit: "50–52", flat: "26 × 32" },
  { id: "3xl", label: "3XL", fit: "54–56", flat: "28 × 33" },
]

export const SHIPPING_METHODS = [
  { id: "Budget", label: "Economy", hint: "Slowest, least expensive" },
  { id: "Standard", label: "Standard", hint: "The usual choice" },
  { id: "Express", label: "Express", hint: "When the night can't wait" },
]

export function colorById(id) {
  return COLORS.find((c) => c.id === id) || COLORS[0]
}

export function luminance(hex) {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** Light ink on dark garments, indigo on light ones. No translucent inks — DTG dithers those. */
export function inkFor(colorId) {
  const color = colorById(colorId)
  const darkGarment = luminance(color.hex) < 0.28
  if (darkGarment) {
    return {
      star: "#F4EFE6",
      line: "#D9CBB4",
      copper: "#D4B07A",
      text: "#F4EFE6",
      muted: "#E7DCCB",
      onDark: true,
    }
  }
  return {
    star: "#1B2438",
    line: "#3C4B66",
    copper: "#8C6436",
    text: "#1B2438",
    muted: "#2A354C",
    onDark: false,
  }
}

export function shade(hex, amount) {
  const h = hex.replace("#", "")
  const n = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16)
    return Math.max(0, Math.min(255, Math.round(v + amount * 255)))
  })
  return `#${n.map((v) => v.toString(16).padStart(2, "0")).join("")}`
}

export const COUNTRIES = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["IE", "Ireland"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["NL", "Netherlands"],
  ["BE", "Belgium"],
  ["AT", "Austria"],
  ["CH", "Switzerland"],
  ["IT", "Italy"],
  ["ES", "Spain"],
  ["PT", "Portugal"],
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["FI", "Finland"],
  ["PL", "Poland"],
  ["CZ", "Czechia"],
  ["GR", "Greece"],
  ["JP", "Japan"],
  ["KR", "South Korea"],
  ["SG", "Singapore"],
  ["HK", "Hong Kong"],
  ["MX", "Mexico"],
  ["BR", "Brazil"],
]

export const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
]

export const CA_PROVINCES = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"],
  ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"],
  ["NT", "Northwest Territories"], ["NU", "Nunavut"], ["ON", "Ontario"],
  ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"],
]

export const AU_STATES = [
  ["ACT", "Australian Capital Territory"], ["NSW", "New South Wales"],
  ["NT", "Northern Territory"], ["QLD", "Queensland"], ["SA", "South Australia"],
  ["TAS", "Tasmania"], ["VIC", "Victoria"], ["WA", "Western Australia"],
]

export function regionsFor(country) {
  if (country === "US") return US_STATES
  if (country === "CA") return CA_PROVINCES
  if (country === "AU") return AU_STATES
  return null
}

export const SAMPLE = {
  date: "2014-02-14",
  time: "22:15",
  timezone: "Europe/Paris",
  lat: 48.8566,
  lng: 2.3522,
  place: "Paris",
  countryName: "France",
  names: ["Elena", "Jonah"],
  inscription: "the night we met",
  style: "observatory",
  color: "black",
  size: "m",
  quantity: 1,
}

export const NIGHTS = [
  {
    kicker: "Paris",
    detail: "14 Feb 2014",
    date: "2014-02-14",
    time: "22:15",
    timezone: "Europe/Paris",
    lat: 48.8566,
    lng: 2.3522,
    place: "Paris",
    countryName: "France",
    names: ["Elena", "Jonah"],
    inscription: "the night we met",
  },
  {
    kicker: "Lisbon",
    detail: "12 Jun 2019",
    date: "2019-06-12",
    time: "21:40",
    timezone: "Europe/Lisbon",
    lat: 38.7223,
    lng: -9.1393,
    place: "Lisbon",
    countryName: "Portugal",
    names: ["Mara", "Leo"],
    inscription: "we stayed",
  },
  {
    kicker: "Kyoto",
    detail: "1 Jan 2000",
    date: "2000-01-01",
    time: "00:12",
    timezone: "Asia/Tokyo",
    lat: 35.0116,
    lng: 135.7681,
    place: "Kyoto",
    countryName: "Japan",
    names: ["Hana"],
    inscription: "the year turned",
  },
]
