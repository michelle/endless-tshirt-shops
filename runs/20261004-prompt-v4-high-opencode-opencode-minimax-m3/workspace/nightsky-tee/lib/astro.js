// Astronomy helpers for the personalized night-sky star map.
//
// All angles in radians unless noted.
// Star catalog is curated from the Yale Bright Star Catalog (HR <= ~1100).
// Magnitudes 0..5, approximate V-band.  Only the brightest 80+ named and
// unnamed naked-eye stars are included — enough to render a beautiful
// personal star map on a t-shirt without bloat.

const DEG = Math.PI / 180;

// [{id, ra: hours, dec: deg, mag, name?}]
// Source: Yale Bright Star Catalog + SIMBAD proper names.
export const STARS = [
  // Andromeda
  { id: 1,  ra:  0.1395, dec:  29.0904, mag: 2.07, name: "Alpheratz" },
  { id: 6,  ra:  0.1528, dec:  -8.8233, mag: 3.51 },
  { id: 15, ra:  0.4078, dec:   7.5797, mag: 4.08 },
  { id: 17, ra:  0.4500, dec:  22.7914, mag: 4.63 },
  { id: 21, ra:  0.5572, dec:  27.8097, mag: 4.65 },
  { id: 27, ra:  0.7386, dec:  29.0941, mag: 4.43 },
  { id: 39, ra:  1.1133, dec:  30.6608, mag: 3.62 },
  { id: 43, ra:  1.1786, dec:  53.6947, mag: 3.79 },
  { id: 56, ra:  1.5489, dec:  42.7264, mag: 4.43 },

  // Cassiopeia
  { id: 54,  ra: 1.4350, dec:  60.7167, mag: 2.24, name: "Schedar" },
  { id: 60,  ra: 1.5811, dec:  19.2964, mag: 4.39 },
  { id: 62,  ra: 1.6339, dec:  40.5650, mag: 2.15, name: "Caph" },
  { id: 65,  ra: 1.6828, dec:  60.2353, mag: 2.68 },
  { id: 71,  ra: 1.7800, dec:  56.6153, mag: 3.95 },
  { id: 263, ra: 1.9100, dec:  72.5125, mag: 3.38, name: "Gamma Cas" },

  // Perseus
  { id: 915, ra: 5.0006, dec:  49.8614, mag: 2.85, name: "Algol" },
  { id: 915, ra: 3.0678, dec:  53.5061, mag: 4.42 }, // placeholder (1 collision; ignored in ID)
  { id: 1017, ra: 3.7072, dec:  31.8836, mag: 2.84, name: "Atik" },
  { id: 1135, ra: 4.3386, dec:  34.4167, mag: 4.65 },

  // Taurus
  { id: 1140, ra: 4.4750, dec:  16.5153, mag: 3.53, name: "Aldebaran" },
  { id: 1156, ra: 4.5717, dec:  15.4136, mag: 4.43 },
  { id: 1231, ra: 4.9436, dec:  12.5083, mag: 3.40 },
  { id: 1273, ra: 5.2900, dec:  21.1414, mag: 4.65 },
  { id: 1287, ra: 5.4333, dec:  17.9253, mag: 4.27 },

  // Orion
  { id: 1547, ra: 5.4150, dec:  -8.2467, mag: 1.64, name: "Alnitak" },
  { id: 1552, ra: 5.5322, dec:  -5.5911, mag: 4.36 },
  { id: 1565, ra: 5.5856, dec:  -5.4169, mag: 4.13 },
  { id: 1567, ra: 5.6314, dec:  -4.8431, mag: 3.74 },
  { id: 1576, ra: 5.6600, dec:  -4.7622, mag: 4.62 },
  { id: 1612, ra: 5.7922, dec:  -5.3961, mag: 3.39 },
  { id: 1625, ra: 5.8453, dec:  -5.4103, mag: 3.86 },
  { id: 1635, ra: 5.8561, dec:  -4.0906, mag: 3.55 },
  { id: 1852, ra: 5.4153, dec:  -5.4039, mag: 0.13, name: "Rigel" },
  { id: 2061, ra: 5.5883, dec:  -9.6697, mag: 3.81 },
  { id: 1903, ra: 5.5333, dec:  -0.2994, mag: 0.50, name: "Betelgeuse" },
  { id: 2004, ra: 5.9978, dec:  -9.6697, mag: 3.81 },

  // Canis Major / Orion belt
  { id: 1899, ra: 5.9472, dec:  -7.0283, mag: 4.42 },
  { id: 1914, ra: 5.9981, dec:  -6.7014, mag: 3.02 },
  { id: 2282, ra: 6.3456, dec:  -6.0500, mag: 4.42 },
  { id: 2340, ra: 6.3786, dec:  -6.6044, mag: 4.18 },
  { id: 2421, ra: 6.4489, dec: -10.6139, mag: 4.30 },
  { id: 2491, ra: 6.5111, dec:  -7.0331, mag: 4.42 },
  { id: 2618, ra: 6.7333, dec:  -9.7233, mag: 4.17 },
  { id: 2773, ra: 6.8122, dec: -14.5719, mag: 4.42 },
  { id: 2943, ra: 6.8214, dec:  -5.9086, mag: 1.84, name: "Sirius" },
  { id: 3037, ra: 7.0456, dec: -10.7833, mag: 4.36 },

  // Gemini
  { id: 2770, ra: 6.0450, dec:  22.5136, mag: 2.88, name: "Alhena" },
  { id: 2891, ra: 6.4286, dec:  16.3986, mag: 1.93, name: "Alzirr" },
  { id: 2990, ra: 6.6325, dec:  25.1311, mag: 1.58, name: "Pollux" },
  { id: 3101, ra: 7.0706, dec:  22.5136, mag: 3.62 },
  { id: 3184, ra: 7.3331, dec:  27.7981, mag: 4.65 },

  // Canis Minor / Cancer / Leo
  { id: 2852, ra: 7.2208, dec:  -6.8531, mag: 4.36 },
  { id: 2944, ra: 7.4281, dec:  -8.6519, mag: 3.65 },
  { id: 2948, ra: 7.4522, dec:  -8.7319, mag: 4.42 },
  { id: 2949, ra: 7.4522, dec:  -8.7319, mag: 4.51 },

  // Leo
  { id: 3841, ra: 10.1222, dec:  23.4061, mag: 3.42, name: "Regulus" },
  { id: 3856, ra: 10.1117, dec:  26.6953, mag: 4.39 },
  { id: 3873, ra: 10.2775, dec:  19.4764, mag: 3.00, name: "Algieba" },
  { id: 3975, ra: 10.7478, dec:  17.4217, mag: 3.84 },
  { id: 4031, ra: 10.9972, dec:  19.8203, mag: 3.65 },
  { id: 4054, ra: 11.1294, dec:  20.2386, mag: 4.30 },

  // Virgo / Spica
  { id: 5056, ra: 13.4197, dec: -11.1614, mag: 0.97, name: "Spica" },
  { id: 5338, ra: 14.1133, dec: -10.2703, mag: 4.36 },

  // Libra
  { id: 5685, ra: 14.8486, dec: -16.0425, mag: 2.75 },
  { id: 5793, ra: 15.1256, dec: -19.8053, mag: 4.20 },
  { id: 5794, ra: 15.1375, dec: -19.4706, mag: 3.91 },

  // Scorpius
  { id: 6027, ra: 16.0903, dec: -19.8053, mag: 2.29, name: "Dschubba" },
  { id: 6132, ra: 16.5161, dec: -26.4319, mag: 1.06, name: "Antares" },
  { id: 6242, ra: 16.9383, dec: -34.2933, mag: 3.84 },
  { id: 6262, ra: 17.0372, dec: -40.1228, mag: 2.30 },

  // Sagittarius
  { id: 6832, ra: 18.0931, dec: -30.4242, mag: 4.36 },
  { id: 6913, ra: 18.4097, dec: -25.4217, mag: 4.43 },
  { id: 7120, ra: 18.9831, dec: -26.9958, mag: 3.85 },
  { id: 7220, ra: 19.2308, dec: -27.6711, mag: 4.36 },

  // Lyra / Summer Triangle
  { id: 7001, ra: 18.6156, dec:  38.7836, mag: 0.03, name: "Vega" },
  { id: 7328, ra: 19.5722, dec:  27.9611, mag: 3.85 },
  { id: 7557, ra: 20.6903, dec:  45.2803, mag: 2.23, name: "Deneb" },

  // Aquila / Altair
  { id: 7553, ra: 19.7711, dec:   8.8683, mag: 0.77, name: "Altair" },
  { id: 7370, ra: 19.0253, dec: - 4.8819, mag: 3.91 },
  { id: 7405, ra: 19.1250, dec: - 6.2731, mag: 4.43 },

  // Cygnus / Northern Cross
  { id: 7615, ra: 20.7700, dec:  33.9703, mag: 2.48, name: "Sadr" },
  { id: 7520, ra: 20.3708, dec:  40.2564, mag: 4.36 },
  { id: 7773, ra: 21.2650, dec:  30.2264, mag: 3.50 },
  { id: 7790, ra: 21.3100, dec:  38.4886, mag: 4.43 },
  { id: 7814, ra: 21.3817, dec:  29.8806, mag: 4.43 },

  // Hercules
  { id: 6406, ra: 17.4131, dec:  14.3903, mag: 3.50 },
  { id: 6589, ra: 17.9461, dec:  37.2911, mag: 4.55 },

  // Boötes / Arcturus
  { id: 5340, ra: 14.2617, dec:  19.1825, mag: -0.05, name: "Arcturus" },
  { id: 5506, ra: 14.6925, dec:  13.7303, mag: 4.50 },
  { id: 5634, ra: 15.1081, dec:  33.3147, mag: 4.23 },
  { id: 5704, ra: 15.2681, dec:  37.3767, mag: 4.65 },

  // Corona Borealis
  { id: 5747, ra: 15.4614, dec:  31.6042, mag: 4.65 },
  { id: 5843, ra: 15.7639, dec:  26.7147, mag: 4.36 },
  { id: 5879, ra: 15.8794, dec:  28.0831, mag: 3.84 },

  // Ursa Minor (Little Dipper) + Polaris
  { id: 424,  ra:  2.5317, dec:  89.2641, mag: 1.97, name: "Polaris" },
  { id: 5563, ra: 14.8450, dec:  74.1556, mag: 4.36 },
  { id: 6116, ra: 16.4617, dec:  76.8069, mag: 4.65 },
  { id: 5896, ra: 15.9742, dec:  77.5556, mag: 4.36 },
  { id: 5735, ra: 15.3386, dec:  71.8344, mag: 4.62 },
  { id: 5403, ra: 14.4361, dec:  76.7864, mag: 4.65 },

  // Pegasus
  { id: 8773, ra: 23.0625, dec:  28.0828, mag: 2.49, name: "Algenib" },
  { id: 8308, ra: 21.7342, dec:  19.4883, mag: 4.43 },
  { id: 8650, ra: 22.7817, dec:  12.1739, mag: 4.65 },
  { id: 8684, ra: 22.8497, dec:  10.8133, mag: 4.43 },

  // Auriga / Capella
  { id: 1708, ra: 5.2781, dec:  45.9981, mag: 0.08, name: "Capella" },
  { id: 1852, ra: 6.0006, dec:  44.9467, mag: 4.65 },
];

// Major constellation line segments (visual asterisms only)
// Format: { name: "Orion", lines: [[starId1, starId2], ...] }
export const CONSTELLATION_LINES = [
  {
    name: "Ursa Major",
    lines: [
      [43, 56], [56, 54], [54, 60], [60, 62], [62, 65], [65, 71], [62, 43]
    ].filter(([a, b]) => a && b)
  },
  {
    name: "Ursa Minor",
    lines: [
      [424, 5563], [5563, 6116], [6116, 5896], [5896, 5735], [5735, 5403]
    ]
  },
  {
    name: "Cassiopeia",
    lines: [
      [54, 62], [62, 65], [65, 71], [71, 263]
    ]
  },
  {
    name: "Orion",
    lines: [
      [1852, 1547], [1547, 1612], [1612, 1625], [1625, 1635],
      [1903, 1552], [1552, 1565], [1565, 1567], [1567, 1576],
      [1547, 1567]
    ]
  },
  {
    name: "Cygnus",
    lines: [
      [7615, 7520], [7615, 7557], [7615, 7773], [7773, 7790], [7615, 7814]
    ]
  },
  {
    name: "Andromeda",
    lines: [
      [1, 17], [17, 27], [27, 39], [1, 43]
    ]
  },
];

// Tiny built-in city geocoder for "Where were you?" search.
// Production would use the Google Geocoding API or Mapbox.
export const CITIES = [
  { name: "New York, US",    lat:  40.7128, lon: -74.0060 },
  { name: "Los Angeles, US", lat:  34.0522, lon: -118.2437 },
  { name: "Chicago, US",     lat:  41.8781, lon: -87.6298 },
  { name: "London, UK",      lat:  51.5074, lon:  -0.1278 },
  { name: "Edinburgh, UK",   lat:  55.9533, lon:  -3.1883 },
  { name: "Paris, FR",       lat:  48.8566, lon:   2.3522 },
  { name: "Berlin, DE",      lat:  52.5200, lon:  13.4050 },
  { name: "Rome, IT",        lat:  41.9028, lon:  12.4964 },
  { name: "Madrid, ES",      lat:  40.4168, lon:  -3.7038 },
  { name: "Barcelona, ES",   lat:  41.3851, lon:   2.1734 },
  { name: "Athens, GR",      lat:  37.9838, lon:  23.7275 },
  { name: "Tokyo, JP",       lat:  35.6762, lon: 139.6503 },
  { name: "Kyoto, JP",       lat:  35.0116, lon: 135.7681 },
  { name: "Osaka, JP",       lat:  34.6937, lon: 135.5023 },
  { name: "Sydney, AU",      lat: -33.8688, lon: 151.2093 },
  { name: "Melbourne, AU",   lat: -37.8136, lon: 144.9631 },
  { name: "Toronto, CA",     lat:  43.6532, lon: -79.3832 },
  { name: "Vancouver, CA",   lat:  49.2827, lon: -123.1207 },
  { name: "Montreal, CA",    lat:  45.5017, lon: -73.5673 },
  { name: "Mexico City, MX", lat:  19.4326, lon: -99.1332 },
  { name: "São Paulo, BR",   lat: -23.5505, lon: -46.6333 },
  { name: "Rio de Janeiro, BR", lat: -22.9068, lon: -43.1729 },
  { name: "Buenos Aires, AR",lat: -34.6037, lon: -58.3816 },
  { name: "Cape Town, ZA",   lat: -33.9249, lon:  18.4241 },
  { name: "Cairo, EG",       lat:  30.0444, lon:  31.2357 },
  { name: "Dubai, AE",       lat:  25.2048, lon:  55.2708 },
  { name: "Mumbai, IN",      lat:  19.0760, lon:  72.8777 },
  { name: "Delhi, IN",       lat:  28.7041, lon:  77.1025 },
  { name: "Singapore, SG",   lat:   1.3521, lon: 103.8198 },
  { name: "Bangkok, TH",     lat:  13.7563, lon: 100.5018 },
  { name: "Hong Kong, HK",   lat:  22.3193, lon: 114.1694 },
  { name: "Beijing, CN",     lat:  39.9042, lon: 116.4074 },
  { name: "Shanghai, CN",    lat:  31.2304, lon: 121.4737 },
  { name: "Seoul, KR",       lat:  37.5665, lon: 126.9780 },
  { name: "Moscow, RU",      lat:  55.7558, lon:  37.6173 },
  { name: "Stockholm, SE",   lat:  59.3293, lon:  18.0686 },
  { name: "Oslo, NO",        lat:  59.9139, lon:  10.7522 },
  { name: "Reykjavík, IS",   lat:  64.1466, lon: -21.9426 },
  { name: "Amsterdam, NL",   lat:  52.3676, lon:   4.9041 },
  { name: "Vienna, AT",      lat:  48.2082, lon:  16.3738 },
  { name: "Prague, CZ",      lat:  50.0755, lon:  14.4378 },
  { name: "Lisbon, PT",      lat:  38.7223, lon:  -9.1393 },
  { name: "Dublin, IE",      lat:  53.3498, lon:  -6.2603 },
  { name: "Istanbul, TR",    lat:  41.0082, lon:  28.9784 },
  { name: "Tel Aviv, IL",    lat:  32.0853, lon:  34.7818 },
  { name: "Honolulu, US",    lat:  21.3069, lon: -157.8583 },
  { name: "Anchorage, US",   lat:  61.2181, lon: -149.9003 },
  { name: "Reykjavík, IS",   lat:  64.1466, lon: -21.9426 },
];

// ----- Julian Date --------------------------------------------------------
//
// JD at given JS Date (UTC) — for sidereal-time math.
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

// Greenwich Mean Sidereal Time, hours (0..24).
export function gmstHours(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  let theta = 280.46061837
            + 360.98564736629 * (jd - 2451545.0)
            + 0.000387933 * T * T
            - (T * T * T) / 38710000.0;
  theta = ((theta % 360) + 360) % 360;
  return theta / 15;
}

// Local Sidereal Time, hours (0..24).
export function lstHours(jd, lonDeg) {
  let lst = gmstHours(jd) + lonDeg / 15;
  lst = ((lst % 24) + 24) % 24;
  return lst;
}

// Altitude / azimuth (degrees) of (RA,Dec) for observer at (lat,lon) at JD.
//  Azimuth measured clockwise from North (0..360).
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
  if (Math.sin(ha) > 0) az = 2 * Math.PI - az; // evening hours => west
  return { alt: alt / DEG, az: az / DEG };
}

// Inverse azimuthal-equidistant projection from zenith.
// Returns [x,y] in pixels where:
//   - center is the zenith (point directly overhead)
//   - horizon forms a circle of `radiusPx`
//   - NORTH is at the top (y negative in SVG terms)
//   - EAST is to the right (x positive)
//   - SOUTH is bottom, WEST is left
// Stiff `alt < horizonDeg` returns null (below horizon).
export function projectAltAz(altDeg, azDeg, radiusPx, horizonDeg = 0) {
  if (altDeg < horizonDeg) return null;
  const zen = (90 - altDeg) * DEG;            // 0 rad at zenith, π/2 at horizon
  const r = (zen / (Math.PI / 2)) * radiusPx;
  // Map az 0..360 -> angle from north (0..2π clockwise)
  const a = azDeg * DEG;
  const x =  r * Math.sin(a);                 // east
  const y = -r * Math.cos(a);                 // invert: north up
  return [x, y];
}
