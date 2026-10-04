// Offline geocoder backed by GeoNames cities5000 (data/cities.tsv).
// No external API dependency; deterministic; instant.

import { readFile } from 'fs/promises'
import path from 'path'

let citiesPromise = null

function loadCities() {
  if (!citiesPromise) {
    citiesPromise = readFile(path.join(process.cwd(), 'data', 'cities.tsv'), 'utf8')
      .then((txt) => {
        const cities = []
        for (const line of txt.split('\n')) {
          if (!line) continue
          const [key, name, admin, country, cc, lat, lon, pop, tz] = line.split('\t')
          if (!key || !name) continue
          cities.push([key, name, admin, country, cc, +lat, +lon, +pop, tz])
        }
        return cities
      })
      .catch((err) => {
        citiesPromise = null
        throw err
      })
  }
  return citiesPromise
}

export async function geocode(query, limit = 8) {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const cities = await loadCities()
  const matches = []
  const long = q.length >= 4
  for (const c of cities) {
    const key = c[0]
    let score = 0
    if (key.startsWith(q)) score = key === q ? 5 : 3
    else if (long && key.includes(' ' + q)) score = 2
    else if (long && key.includes(q)) score = 1
    else continue
    matches.push([score, c[7], c]) // score, population, record
    if (matches.length > 400) break // hard cap for pathological prefixes
  }
  matches.sort((a, b) => b[0] - a[0] || b[1] - a[1])
  return matches.slice(0, limit).map(([, , c]) => ({
    name: c[1],
    admin: c[2],
    country: c[3],
    cc: c[4],
    lat: c[5],
    lon: c[6],
    tz: c[8],
    label: c[1] + (c[2] ? `, ${c[2]}` : '') + `, ${c[3]}`,
  }))
}
