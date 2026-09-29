// Computes the sky as seen from a place and instant, projected stereographically
// onto a unit disc: zenith at the centre, horizon at radius 1, north up and east
// on the left (as you'd see it lying on your back looking up).

import * as Astronomy from "astronomy-engine";
import skyData from "./sky-data.json";

type Star = [ra: number, dec: number, mag: number];
type Pt = [ra: number, dec: number];
const DATA = skyData as { stars: Star[]; lines: Pt[][]; names: [string, number, number, number][] };

export type SkyStar = { x: number; y: number; mag: number };
export type SkyBody = { name: string; x: number; y: number; alt: number };
export type SkyMoon = SkyBody & { phase: number; fraction: number; sunAngle: number };
export type Sky = {
  stars: SkyStar[];
  lines: [number, number][][];
  names: { name: string; x: number; y: number }[];
  planets: SkyBody[];
  moon: SkyMoon | null;
};

const D2R = Math.PI / 180;

export function computeSky(when: Date, lat: number, lon: number): Sky {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const time = Astronomy.MakeTime(when);
  const m = Astronomy.Rotation_EQJ_HOR(time, observer).rot;

  // J2000 equatorial (ra, dec in degrees) -> projected [x, y, z(up)]
  const project = (ra: number, dec: number): [number, number, number] => {
    const cd = Math.cos(dec * D2R);
    const ex = cd * Math.cos(ra * D2R);
    const ey = cd * Math.sin(ra * D2R);
    const ez = Math.sin(dec * D2R);
    const n = m[0][0] * ex + m[1][0] * ey + m[2][0] * ez; // north
    const w = m[0][1] * ex + m[1][1] * ey + m[2][1] * ez; // west
    const u = m[0][2] * ex + m[1][2] * ey + m[2][2] * ez; // up
    const k = 1 / (1 + u);
    return [w * k, -n * k, u];
  };

  const stars: SkyStar[] = [];
  for (const [ra, dec, mag] of DATA.stars) {
    const [x, y, u] = project(ra, dec);
    if (u > -0.005) stars.push({ x, y, mag });
  }

  const lines: [number, number][][] = [];
  for (const poly of DATA.lines) {
    let run: [number, number][] = [];
    for (const [ra, dec] of poly) {
      const [x, y, u] = project(ra, dec);
      // Keep segments that reach a little below the horizon; the disc clip trims them.
      if (u > -0.35) run.push([x, y]);
      else {
        if (run.length > 1) lines.push(run);
        run = [];
      }
    }
    if (run.length > 1) lines.push(run);
  }

  const names: Sky["names"] = [];
  for (const [name, ra, dec, rank] of DATA.names) {
    if (rank > 2) continue;
    const [x, y, u] = project(ra, dec);
    if (u > 0.12) names.push({ name, x, y });
  }

  // Horizontal unit vector [north, west, up] for a solar-system body.
  const bodyVec = (body: Astronomy.Body): [number, number, number] => {
    const eq = Astronomy.Equator(body, time, observer, true, true);
    const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, "normal");
    const alt = hor.altitude * D2R;
    const az = hor.azimuth * D2R;
    return [Math.cos(alt) * Math.cos(az), -Math.cos(alt) * Math.sin(az), Math.sin(alt)];
  };
  const toDisc = ([n, w, u]: [number, number, number]) => ({ x: w / (1 + u), y: -n / (1 + u) });
  const bodyPos = (body: Astronomy.Body) => {
    const v = bodyVec(body);
    return { ...toDisc(v), alt: Math.asin(v[2]) / D2R };
  };

  const planets: SkyBody[] = [];
  for (const b of [Astronomy.Body.Mercury, Astronomy.Body.Venus, Astronomy.Body.Mars, Astronomy.Body.Jupiter, Astronomy.Body.Saturn]) {
    const p = bodyPos(b);
    if (p.alt > 0) planets.push({ name: String(b), ...p });
  }

  let moon: SkyMoon | null = null;
  const mv = bodyVec(Astronomy.Body.Moon);
  if (mv[2] > 0) {
    const phase = Astronomy.MoonPhase(time);
    const fraction = Astronomy.Illumination(Astronomy.Body.Moon, time).phase_fraction;
    // Which way the lit limb faces on the chart: step a hair from the moon toward the sun.
    const sv = bodyVec(Astronomy.Body.Sun);
    const dot = sv[0] * mv[0] + sv[1] * mv[1] + sv[2] * mv[2];
    const t = sv.map((c, i) => c - dot * mv[i]);
    const tl = Math.hypot(t[0], t[1], t[2]) || 1;
    const step = mv.map((c, i) => c + (0.01 * t[i]) / tl) as [number, number, number];
    const sl = Math.hypot(...step);
    const a = toDisc(mv);
    const b = toDisc(step.map((c) => c / sl) as [number, number, number]);
    moon = { name: "Moon", ...a, alt: Math.asin(mv[2]) / D2R, phase, fraction, sunAngle: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  return { stars, lines, names, planets, moon };
}

/** Phase name for the moon (for copy on the order page and designer). */
export function moonPhaseName(phase: number): string {
  const names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  return names[Math.round(phase / 45) % 8];
}
