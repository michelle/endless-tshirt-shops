// Geocoding via OpenStreetMap Nominatim (no API key required).

export interface GeoResult {
  lat: number;
  lng: number;
  label: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export async function geocode(query: string): Promise<GeoResult | null> {
  const q = query.trim();
  if (!q) return null;

  const url = `${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Stellara-Tshirt-Store/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data || data.length === 0) return null;
    const first = data[0];
    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      label: first.display_name,
    };
  } catch (e) {
    console.error("geocode error:", (e as Error)?.message || e);
    return null;
  }
}

// A small built-in fallback for common cities, so the store still works if
// the geocoding service is unreachable.
const FALLBACK: Record<string, [number, number]> = {
  "new york": [40.7128, -74.006],
  "los angeles": [34.0522, -118.2437],
  "london": [51.5074, -0.1278],
  "paris": [48.8566, 2.3522],
  "san francisco": [37.7749, -122.4194],
  "tokyo": [35.6762, 139.6503],
  "sydney": [-33.8688, 151.2093],
  "berlin": [52.52, 13.405],
  "chicago": [41.8781, -87.6298],
  "toronto": [43.6532, -79.3832],
};

export function fallbackGeocode(query: string): GeoResult | null {
  const q = query.trim().toLowerCase();
  for (const [key, [lat, lng]] of Object.entries(FALLBACK)) {
    if (q.includes(key)) {
      return { lat, lng, label: query.trim() };
    }
  }
  return null;
}
