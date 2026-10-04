import fs from "node:fs";
import path from "node:path";

export type PlaceHit = { name: string; region: string; country: string; cc: string; lat: number; lon: number; tz: string };

type Raw = { tzs: string[]; countries: Record<string, string>; cities: [string, string, string, string, number, number, number, number][] };
let data: Raw | null = null;
let keys: string[] = [];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function load() {
  if (!data) {
    data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "cities.json"), "utf8")) as Raw;
    keys = data.cities.map((c) => fold(c[1] || c[0]));
  }
  return data;
}

// cities5000.json is sorted by population, so the first matches are the most relevant.
export function searchPlaces(q: string, limit = 8): PlaceHit[] {
  const d = load();
  const [cityPart, ...rest] = q.split(",");
  const needle = fold(cityPart);
  const qualifier = fold(rest.join(" "));
  if (needle.length < 2) return [];
  const starts: number[] = [], contains: number[] = [];
  for (let i = 0; i < keys.length && starts.length < 60; i++) {
    const k = keys[i];
    const hit = k.startsWith(needle) ? starts : k.includes(" " + needle) ? contains : null;
    if (!hit) continue;
    if (qualifier) {
      const c = d.cities[i];
      const hay = fold(`${c[3]} ${d.countries[c[2]] ?? ""} ${c[2]}`);
      if (!hay.includes(qualifier)) continue;
    }
    hit.push(i);
  }
  return [...starts, ...contains].slice(0, limit).map((i) => {
    const c = d.cities[i];
    return { name: c[0], region: c[3], country: d.countries[c[2]] ?? c[2], cc: c[2], lat: c[4], lon: c[5], tz: d.tzs[c[6]] };
  });
}
