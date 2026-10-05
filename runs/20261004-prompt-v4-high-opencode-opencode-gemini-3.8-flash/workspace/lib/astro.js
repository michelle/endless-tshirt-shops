// lib/astro.js
// Astronomical algorithms & curated Yale Bright Star Catalog subset.
// Computes exact star positions (altitude & azimuth) for any observer date/time and coordinates.

const DEG = Math.PI / 180;

// Curated brightest stars with Right Ascension (hours), Declination (degrees), V magnitude, and proper names.
export const STARS = [
  // Ursa Major & Minor (The Great Bear & Little Bear)
  { id: 101, ra: 11.062, dec: 61.751, mag: 1.79, name: "Dubhe" },
  { id: 102, ra: 11.031, dec: 56.382, mag: 2.37, name: "Merak" },
  { id: 103, ra: 11.900, dec: 53.695, mag: 2.44, name: "Phecda" },
  { id: 104, ra: 12.257, dec: 57.032, mag: 3.31, name: "Megrez" },
  { id: 105, ra: 12.900, dec: 55.960, mag: 1.77, name: "Alioth" },
  { id: 106, ra: 13.399, dec: 54.925, mag: 2.27, name: "Mizar" },
  { id: 107, ra: 13.792, dec: 49.313, mag: 1.86, name: "Alkaid" },
  { id: 108, ra: 2.530,  dec: 89.264, mag: 1.98, name: "Polaris" },
  { id: 109, ra: 14.845, dec: 74.156, mag: 2.08, name: "Kochab" },

  // Orion
  { id: 201, ra: 5.919,  dec: 7.407,   mag: 0.50, name: "Betelgeuse" },
  { id: 202, ra: 5.242,  dec: -8.201,  mag: 0.13, name: "Rigel" },
  { id: 203, ra: 5.419,  dec: 6.350,   mag: 1.64, name: "Bellatrix" },
  { id: 204, ra: 5.796,  dec: -9.670,  mag: 2.06, name: "Saiph" },
  { id: 205, ra: 5.533,  dec: -0.299,  mag: 2.23, name: "Mintaka" },
  { id: 206, ra: 5.604,  dec: -1.202,  mag: 1.70, name: "Alnilam" },
  { id: 207, ra: 5.679,  dec: -1.943,  mag: 1.77, name: "Alnitak" },

  // Canis Major & Minor
  { id: 301, ra: 6.752,  dec: -16.716, mag: -1.46, name: "Sirius" },
  { id: 302, ra: 6.977,  dec: -28.972, mag: 1.50, name: "Adhara" },
  { id: 303, ra: 7.140,  dec: -26.393, mag: 1.84, name: "Wezen" },
  { id: 304, ra: 6.378,  dec: -17.956, mag: 1.98, name: "Mirzam" },
  { id: 305, ra: 7.653,  dec: 5.225,   mag: 0.38, name: "Procyon" },

  // Taurus
  { id: 401, ra: 4.599,  dec: 16.509,  mag: 0.85, name: "Aldebaran" },
  { id: 402, ra: 5.438,  dec: 28.607,  mag: 1.65, name: "Elnath" },
  { id: 403, ra: 3.791,  dec: 24.105,  mag: 2.87, name: "Alcyone (Pleiades)" },

  // Cassiopeia & Andromeda
  { id: 501, ra: 0.675,  dec: 56.537,  mag: 2.23, name: "Schedar" },
  { id: 502, ra: 0.153,  dec: 59.150,  mag: 2.27, name: "Caph" },
  { id: 503, ra: 0.945,  dec: 60.717,  mag: 2.47, name: "Gamma Cas" },
  { id: 504, ra: 1.428,  dec: 60.235,  mag: 2.68, name: "Ruchbah" },
  { id: 505, ra: 1.907,  dec: 63.670,  mag: 3.37, name: "Segin" },
  { id: 506, ra: 0.139,  dec: 29.090,  mag: 2.06, name: "Alpheratz" },
  { id: 507, ra: 1.162,  dec: 35.621,  mag: 2.06, name: "Mirach" },
  { id: 508, ra: 2.065,  dec: 42.329,  mag: 2.26, name: "Almach" },

  // Summer Triangle & Neighbors (Lyra, Cygnus, Aquila)
  { id: 601, ra: 18.616, dec: 38.784,  mag: 0.03, name: "Vega" },
  { id: 602, ra: 20.690, dec: 45.280,  mag: 1.25, name: "Deneb" },
  { id: 603, ra: 19.846, dec: 8.868,   mag: 0.77, name: "Altair" },
  { id: 604, ra: 19.512, dec: 27.960,  mag: 3.10, name: "Albireo" },
  { id: 605, ra: 20.370, dec: 40.257,  mag: 2.23, name: "Sadr" },
  { id: 606, ra: 20.770, dec: 33.970,  mag: 2.46, name: "Gienah Cygnus" },

  // Bootes & Corona Borealis
  { id: 701, ra: 14.261, dec: 19.182,  mag: -0.05, name: "Arcturus" },
  { id: 702, ra: 14.750, dec: 27.074,  mag: 2.70, name: "Izar" },
  { id: 703, ra: 15.578, dec: 26.715,  mag: 2.23, name: "Alphecca" },

  // Scorpius & Sagittarius
  { id: 801, ra: 16.490, dec: -26.432, mag: 0.96, name: "Antares" },
  { id: 802, ra: 16.009, dec: -22.622, mag: 2.32, name: "Graffias" },
  { id: 803, ra: 16.089, dec: -19.805, mag: 2.62, name: "Dschubba" },
  { id: 804, ra: 16.839, dec: -34.293, mag: 2.29, name: "Sargas" },
  { id: 805, ra: 17.560, dec: -37.104, mag: 1.63, name: "Shaula" },
  { id: 806, ra: 18.403, dec: -25.421, mag: 1.85, name: "Kaus Australis" },
  { id: 807, ra: 18.921, dec: -26.297, mag: 2.02, name: "Nunki" },

  // Leo & Virgo
  { id: 901, ra: 10.140, dec: 11.967,  mag: 1.35, name: "Regulus" },
  { id: 902, ra: 10.333, dec: 19.842,  mag: 2.61, name: "Algieba" },
  { id: 903, ra: 11.818, dec: 14.572,  mag: 2.14, name: "Denebola" },
  { id: 904, ra: 13.421, dec: -11.161, mag: 0.98, name: "Spica" },

  // Gemini & Auriga
  { id: 1001, ra: 7.577, dec: 31.888,  mag: 1.58, name: "Castor" },
  { id: 1002, ra: 7.755, dec: 28.026,  mag: 1.14, name: "Pollux" },
  { id: 1003, ra: 5.278, dec: 45.998,  mag: 0.08, name: "Capella" },
  { id: 1004, ra: 5.992, dec: 44.947,  mag: 1.90, name: "Menkalinan" },

  // Southern Skies: Crux & Centaurus
  { id: 1101, ra: 12.443, dec: -63.099, mag: 0.77, name: "Acrux" },
  { id: 1102, ra: 12.795, dec: -59.689, mag: 1.30, name: "Mimosa" },
  { id: 1103, ra: 12.518, dec: -57.113, mag: 1.64, name: "Gacrux" },
  { id: 1104, ra: 14.660, dec: -60.834, mag: -0.01, name: "Alpha Centauri" },
  { id: 1105, ra: 14.064, dec: -60.373, mag: 0.61, name: "Hadar" },

  // Pegasus
  { id: 1201, ra: 23.079, dec: 15.205, mag: 2.48, name: "Markab" },
  { id: 1202, ra: 23.063, dec: 28.083, mag: 2.42, name: "Scheat" },
  { id: 1203, ra: 0.221,  dec: 15.184, mag: 2.83, name: "Algenib" },
  { id: 1204, ra: 21.736, dec: 9.875,  mag: 2.39, name: "Enif" }
];

// Constellation connection lines: pairs of star IDs
export const CONSTELLATIONS = [
  {
    name: "Ursa Major",
    lines: [[101, 102], [102, 103], [103, 104], [104, 101], [104, 105], [105, 106], [106, 107]]
  },
  {
    name: "Orion",
    lines: [
      [201, 203], [203, 205], [205, 206], [206, 207], [207, 204],
      [204, 202], [202, 205], [201, 207]
    ]
  },
  {
    name: "Cassiopeia",
    lines: [[502, 501], [501, 503], [503, 504], [504, 505]]
  },
  {
    name: "Summer Triangle",
    lines: [[601, 602], [602, 603], [603, 601], [602, 605], [605, 604], [605, 606]]
  },
  {
    name: "Scorpius",
    lines: [[802, 803], [803, 801], [801, 804], [804, 805]]
  },
  {
    name: "Leo",
    lines: [[901, 902], [902, 903]]
  },
  {
    name: "Gemini",
    lines: [[1001, 1002]]
  },
  {
    name: "Southern Cross",
    lines: [[1101, 1103], [1102, 1101], [1104, 1105]]
  },
  {
    name: "Pegasus & Andromeda",
    lines: [[1201, 1202], [1202, 506], [506, 1203], [1203, 1201], [506, 507], [507, 508]]
  }
];

// Curated cities list with coordinates
export const CITIES = [
  { name: "New York, USA",       lat: 40.7128,  lon: -74.0060, country: "US" },
  { name: "Los Angeles, USA",    lat: 34.0522,  lon: -118.2437, country: "US" },
  { name: "Chicago, USA",        lat: 41.8781,  lon: -87.6298, country: "US" },
  { name: "San Francisco, USA",  lat: 37.7749,  lon: -122.4194, country: "US" },
  { name: "Miami, USA",          lat: 25.7617,  lon: -80.1918, country: "US" },
  { name: "London, UK",          lat: 51.5074,  lon: -0.1278,  country: "GB" },
  { name: "Paris, France",       lat: 48.8566,  lon: 2.3522,   country: "FR" },
  { name: "Rome, Italy",         lat: 41.9028,  lon: 12.4964,  country: "IT" },
  { name: "Berlin, Germany",     lat: 52.5200,  lon: 13.4050,  country: "DE" },
  { name: "Barcelona, Spain",    lat: 41.3851,  lon: 2.1734,   country: "ES" },
  { name: "Tokyo, Japan",        lat: 35.6762,  lon: 139.6503, country: "JP" },
  { name: "Kyoto, Japan",        lat: 35.0116,  lon: 135.7681, country: "JP" },
  { name: "Sydney, Australia",   lat: -33.8688, lon: 151.2093, country: "AU" },
  { name: "Melbourne, Australia",lat: -37.8136, lon: 144.9631, country: "AU" },
  { name: "Toronto, Canada",     lat: 43.6532,  lon: -79.3832, country: "CA" },
  { name: "Vancouver, Canada",   lat: 49.2827,  lon: -123.1207, country: "CA" },
  { name: "Amsterdam, Netherlands", lat: 52.3676, lon: 4.9041, country: "NL" },
  { name: "Vienna, Austria",     lat: 48.2082,  lon: 16.3738,  country: "AT" },
  { name: "Zurich, Switzerland", lat: 47.3769,  lon: 8.5417,   country: "CH" },
  { name: "Reykjavik, Iceland",  lat: 64.1466,  lon: -21.9426, country: "IS" },
  { name: "Cape Town, South Africa", lat: -33.9249, lon: 18.4241, country: "ZA" },
  { name: "Singapore",           lat: 1.3521,   lon: 103.8198, country: "SG" },
  { name: "Hong Kong",           lat: 22.3193,  lon: 114.1694, country: "HK" },
  { name: "Dubai, UAE",          lat: 25.2048,  lon: 55.2708,  country: "AE" },
  { name: "Auckland, New Zealand", lat: -36.8485, lon: 174.7633, country: "NZ" }
];

// Julian Date for sidereal time math
export function julianDate(d) {
  const Y = d.getUTCFullYear();
  const M = d.getUTCMonth() + 1;
  const DD = d.getUTCDate()
    + d.getUTCHours() / 24
    + d.getUTCMinutes() / (24 * 60)
    + d.getUTCSeconds() / (24 * 60 * 60);
  let y, m;
  if (M <= 2) { y = Y - 1; m = M + 12; } else { y = Y; m = M; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716))
       + Math.floor(30.6001 * (m + 1))
       + DD + B - 1524.5;
}

// Greenwich Mean Sidereal Time in hours (0..24)
export function gmstHours(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  let theta = 280.46061837
            + 360.98564736629 * (jd - 2451545.0)
            + 0.000387933 * T * T
            - (T * T * T) / 38710000.0;
  theta = ((theta % 360) + 360) % 360;
  return theta / 15;
}

// Local Sidereal Time in hours (0..24)
export function lstHours(jd, lonDeg) {
  let lst = gmstHours(jd) + lonDeg / 15;
  lst = ((lst % 24) + 24) % 24;
  return lst;
}

// Calculate Altitude & Azimuth for a celestial coordinate
export function altAz(raHours, decDeg, jd, latDeg, lonDeg) {
  const lst = lstHours(jd, lonDeg);
  let haHours = lst - raHours;
  haHours = ((haHours % 24) + 24) % 24 - 24;
  const ha = haHours * 15 * DEG;
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt = Math.sin(dec) * Math.sin(lat)
               + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(sinAlt);
  const cosAlt = Math.cos(alt);
  let cosAz;
  if (Math.abs(cosAlt) < 1e-9) {
    cosAz = 0;
  } else {
    cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat))
          / (cosAlt * Math.cos(lat));
  }
  cosAz = Math.max(-1, Math.min(1, cosAz));
  let az = Math.acos(cosAz);
  if (Math.sin(ha) > 0) az = 2 * Math.PI - az;
  return { alt: alt / DEG, az: az / DEG };
}

// Stereographic / Azimuthal equidistant projection onto circular sky disc
export function projectAltAz(altDeg, azDeg, radiusPx, horizonDeg = 0) {
  if (altDeg < horizonDeg) return null;
  const zen = (90 - altDeg) * DEG; // 0 at zenith, π/2 at horizon
  const r = (zen / (Math.PI / 2)) * radiusPx;
  const a = azDeg * DEG;
  const x = r * Math.sin(a);
  const y = -r * Math.cos(a); // North up
  return [x, y];
}
