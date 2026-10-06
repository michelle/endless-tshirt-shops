// lib/astronomy.ts
// Thin, well-typed wrapper around astronomy-engine that produces the inputs
// needed by /lib/design.ts. We deliberately use only the high-precision
// equatorial-coordinate helpers — printing wants positions in right
// ascension / declination for the chosen date+observer, not screen-space.

import * as Astronomy from "astronomy-engine";

export interface SkySnapshot {
  /** Local civil date/time at the observer's location (UTC offset applied). */
  localDate: Date;
  /** Latitude / longitude of the observer, in signed degrees. */
  lat: number;
  lng: number;
  /** Pretty location label, e.g. "Lisbon, Portugal". */
  placeName: string;
  /** Sun position. */
  sun: BodyPoint;
  /** Moon position + phase fraction (0 = new, 0.5 = full). */
  moon: BodyPoint & { phaseFraction: number; phaseName: string };
  /** The five classical naked-eye planets. */
  planets: Record<PlanetKey, BodyPoint>;
  /** Azimuth + altitude of every body, in degrees, at the observer. */
  altitudes: Record<BodyKey, AltAz>;
  /** Local sidereal time, in hours, used to rotate the sky onto the page. */
  localSiderealHours: number;
}

export type PlanetKey = "mercury" | "venus" | "mars" | "jupiter" | "saturn";
export type BodyKey = PlanetKey | "sun" | "moon";

export interface BodyPoint {
  /** Right ascension, in hours [0..24). */
  raHours: number;
  /** Declination, in signed degrees [-90..90]. */
  decDeg: number;
  /** Apparent magnitude (if known). Used to size glyph on the print. */
  magnitude: number;
  /** Pretty body name. */
  label: string;
  /** Glyph character to render in the SVG. */
  glyph: string;
}

export interface AltAz {
  altitudeDeg: number;
  azimuthDeg: number;
  /** Convenience: true if the body is currently in the observer's sky. */
  visible: boolean;
}

const PLANET_KEYS: PlanetKey[] = [
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
];

const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

const GLYPHS: Record<BodyKey | string, string> = {
  sun: "☉",
  moon: "☾",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
};

export function snapshot(opts: {
  whenUtc: Date;
  lat: number;
  lng: number;
  placeName: string;
}): SkySnapshot {
  const { whenUtc, lat, lng, placeName } = opts;
  const astroObserver = new Astronomy.Observer(lat, lng, 0);

  // Sun
  const sunEqu = Astronomy.Equator(
    Astronomy.Body.Sun,
    whenUtc,
    astroObserver,
    true /* ofdate */,
    true /* aberration */
  );
  const sunHorizon = Astronomy.Horizon(
    whenUtc,
    astroObserver,
    sunEqu.ra,
    sunEqu.dec,
    "normal"
  );

  // Moon
  const moonEqu = Astronomy.Equator(
    Astronomy.Body.Moon,
    whenUtc,
    astroObserver,
    true,
    true
  );
  const moonHorizon = Astronomy.Horizon(
    whenUtc,
    astroObserver,
    moonEqu.ra,
    moonEqu.dec,
    "normal"
  );
  const moonPhase = Astronomy.MoonPhase(whenUtc); // 0..360
  // phaseFraction: 0 = new, 0.5 = full.
  const phaseFraction = Math.min(
    1,
    Math.max(0, Math.cos(((moonPhase - 180) * Math.PI) / 180) * -0.5 + 0.5),
  );
  const phaseIndex = Math.round((moonPhase / 360) * 8) % 8;

  const planets = {} as Record<PlanetKey, BodyPoint>;
  const altitudes = {} as Record<BodyKey, AltAz>;

  // Sun altitudes
  altitudes.sun = {
    altitudeDeg: sunHorizon.altitude,
    azimuthDeg: sunHorizon.azimuth,
    visible: sunHorizon.altitude > 0,
  };

  // Moon altitudes
  altitudes.moon = {
    altitudeDeg: moonHorizon.altitude,
    azimuthDeg: moonHorizon.azimuth,
    visible: moonHorizon.altitude > 0,
  };

  for (const key of PLANET_KEYS) {
    const body = bodyFromKey(key);
    const equ = Astronomy.Equator(body, whenUtc, astroObserver, true, true);
    const horizon = Astronomy.Horizon(whenUtc, astroObserver, equ.ra, equ.dec, "normal");
    planets[key] = {
      raHours: equ.ra,
      decDeg: equ.dec,
      magnitude: Astronomy.Illumination(body, whenUtc).mag,
      label: titleCase(key),
      glyph: GLYPHS[key],
    };
    altitudes[key] = {
      altitudeDeg: horizon.altitude,
      azimuthDeg: horizon.azimuth,
      visible: horizon.altitude > 0,
    };
  }

  // Local sidereal time in hours (used as rotation anchor of the disc).
  const gstHours = Astronomy.SiderealTime(whenUtc);
  const lstHours = ((gstHours + lng / 15) % 24 + 24) % 24;

  return {
    localDate: whenUtc,
    lat,
    lng,
    placeName,
    sun: {
      raHours: sunEqu.ra,
      decDeg: sunEqu.dec,
      magnitude: -26.74,
      label: "Sun",
      glyph: GLYPHS.sun,
    },
    moon: {
      raHours: moonEqu.ra,
      decDeg: moonEqu.dec,
      magnitude: -12.74,
      phaseFraction,
      phaseName: PHASE_NAMES[phaseIndex],
      label: "Moon",
      glyph: GLYPHS.moon,
    },
    planets,
    altitudes,
    localSiderealHours: lstHours,
  };
}

function bodyFromKey(key: PlanetKey): Astronomy.Body {
  switch (key) {
    case "mercury":
      return Astronomy.Body.Mercury;
    case "venus":
      return Astronomy.Body.Venus;
    case "mars":
      return Astronomy.Body.Mars;
    case "jupiter":
      return Astronomy.Body.Jupiter;
    case "saturn":
      return Astronomy.Body.Saturn;
  }
}

function titleCase(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}
