import { CITIES } from "../../../lib/cities.js"

export const dynamic = "force-dynamic"

export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() || ""
  if (q.length < 2) return Response.json({ results: [] })
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
    url.searchParams.set("name", q)
    url.searchParams.set("count", "6")
    url.searchParams.set("language", "en")
    url.searchParams.set("format", "json")
    const response = await fetch(url, { next: { revalidate: 86400 } })
    if (!response.ok) throw new Error("geocoder")
    const data = await response.json()
    const results = (data.results || []).map((row) => ({
      name: row.name,
      admin1: row.admin1 || "",
      country: row.country || "",
      countryCode: row.country_code || "",
      lat: row.latitude,
      lng: row.longitude,
      timezone: row.timezone,
    }))
    if (results.length) return Response.json({ results })
  } catch {
    // fall through to the bundled list
  }
  const needle = q.toLowerCase()
  const results = CITIES.filter((city) =>
    `${city.name} ${city.admin1} ${city.country}`.toLowerCase().includes(needle)
  ).slice(0, 6)
  return Response.json({ results })
}
