// Astronomical calculation engine for star positions and celestial projections.

export const CITIES = [
  { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'New York, NY', lat: 40.7128, lon: -74.0060 },
  { name: 'London, United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris, France', lat: 48.8566, lon: 2.3522 },
  { name: 'San Francisco, CA', lat: 37.7749, lon: -122.4194 },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'Los Angeles, CA', lat: 34.0522, lon: -118.2437 },
  { name: 'Rome, Italy', lat: 41.9028, lon: 12.4964 },
  { name: 'Honolulu, HI', lat: 21.3069, lon: -157.8583 },
  { name: 'Chicago, IL', lat: 41.8781, lon: -87.6298 },
  { name: 'Berlin, Germany', lat: 52.5200, lon: 13.4050 },
  { name: 'Toronto, Canada', lat: 43.6532, lon: -79.3832 },
  { name: 'Auckland, New Zealand', lat: -36.8485, lon: 174.7633 },
  { name: 'Reykjavik, Iceland', lat: 64.1466, lon: -21.9426 },
];

export const STARS = [
  // Ursa Major (Big Dipper)
  ["Dubhe", 165.93, 61.75, 1.79],
  ["Merak", 165.46, 56.38, 2.37],
  ["Phecda", 178.46, 53.69, 2.44],
  ["Megrez", 183.86, 57.03, 3.31],
  ["Alioth", 193.51, 55.96, 1.77],
  ["Mizar", 200.98, 54.92, 2.23],
  ["Alkaid", 206.89, 49.31, 1.86],

  // Orion
  ["Betelgeuse", 88.79, 7.41, 0.50],
  ["Rigel", 78.63, -8.20, 0.13],
  ["Bellatrix", 81.28, 6.35, 1.64],
  ["Saiph", 86.94, -9.67, 2.09],
  ["Alnitak", 85.19, -1.94, 1.77],
  ["Alnilam", 84.05, -1.20, 1.69],
  ["Mintaka", 83.00, -0.30, 2.23],

  // Cassiopeia
  ["Schedar", 10.13, 56.54, 2.23],
  ["Caph", 2.29, 59.15, 2.27],
  ["Gamma Cas", 14.18, 60.72, 2.47],
  ["Ruchbah", 21.45, 60.23, 2.68],
  ["Segin", 28.60, 63.67, 3.37],

  // Canis Major / Minor
  ["Sirius", 101.29, -16.72, -1.46],
  ["Adhara", 104.66, -28.97, 1.50],
  ["Wezen", 107.10, -26.39, 1.82],
  ["Murzim", 95.67, -17.96, 1.98],
  ["Procyon", 114.83, 5.22, 0.38],

  // Taurus & Gemini
  ["Aldebaran", 68.98, 16.51, 0.85],
  ["Elnath", 81.57, 28.61, 1.65],
  ["Pollux", 116.33, 28.03, 1.14],
  ["Castor", 113.65, 31.89, 1.58],

  // Cygnus, Lyra, Aquila (Summer Triangle)
  ["Deneb", 310.36, 45.28, 1.25],
  ["Sadr", 305.56, 40.26, 2.23],
  ["Gienah", 311.55, 33.97, 2.48],
  ["Albireo", 292.68, 27.96, 3.05],
  ["Vega", 279.23, 38.78, 0.03],
  ["Sheliak", 282.52, 33.36, 3.52],
  ["Sulafat", 284.73, 32.69, 3.25],
  ["Altair", 297.70, 8.87, 0.77],
  ["Tarazed", 296.54, 10.61, 2.72],
  ["Alshain", 298.83, 6.41, 3.71],

  // Leo
  ["Regulus", 152.09, 11.97, 1.35],
  ["Denebola", 177.26, 14.57, 2.14],
  ["Algieba", 154.99, 19.84, 2.08],
  ["Zosma", 168.53, 20.52, 2.56],

  // Boötes & Virgo
  ["Arcturus", 213.92, 19.18, -0.05],
  ["Spica", 201.30, -11.16, 0.98],

  // Scorpius
  ["Antares", 247.35, -26.43, 1.06],
  ["Shaula", 263.40, -37.10, 1.62],
  ["Sargas", 264.33, -43.00, 1.87],
  ["Dschubba", 240.08, -22.62, 2.32],

  // Polaris (North Star)
  ["Polaris", 37.95, 89.26, 1.98],

  // Southern Cross (Crux)
  ["Acrux", 186.65, -63.10, 0.76],
  ["Mimosa", 191.93, -59.69, 1.25],
  ["Gacrux", 187.79, -57.11, 1.63],
  ["Imai", 183.84, -58.75, 2.79],

  // Carina & Eridanus & Centaurus
  ["Canopus", 95.99, -52.70, -0.74],
  ["Achernar", 24.43, -57.24, 0.46],
  ["Hadar", 210.96, -60.37, 0.61],
  ["Rigil Kentaurus", 219.90, -60.83, -0.27],

  // Pegasus
  ["Markab", 346.19, 15.21, 2.49],
  ["Scheat", 345.94, 28.08, 2.44],
  ["Algenib", 3.31, 15.18, 2.84],
  ["Enif", 326.05, 9.87, 2.38],
];

export const CONSTELLATIONS = [
  // Ursa Major
  ["Dubhe", "Merak"], ["Merak", "Phecda"], ["Phecda", "Megrez"], ["Megrez", "Dubhe"],
  ["Megrez", "Alioth"], ["Alioth", "Mizar"], ["Mizar", "Alkaid"],
  // Orion
  ["Betelgeuse", "Bellatrix"], ["Bellatrix", "Rigel"], ["Betelgeuse", "Saiph"], ["Saiph", "Rigel"],
  ["Betelgeuse", "Alnitak"], ["Bellatrix", "Mintaka"],
  ["Mintaka", "Alnilam"], ["Alnilam", "Alnitak"],
  // Cassiopeia
  ["Caph", "Schedar"], ["Schedar", "Gamma Cas"], ["Gamma Cas", "Ruchbah"], ["Ruchbah", "Segin"],
  // Cygnus
  ["Deneb", "Sadr"], ["Sadr", "Albireo"], ["Sadr", "Gienah"],
  // Summer Triangle
  ["Vega", "Deneb"], ["Deneb", "Altair"], ["Altair", "Vega"],
  // Gemini
  ["Castor", "Pollux"],
  // Leo
  ["Regulus", "Algieba"], ["Algieba", "Zosma"], ["Zosma", "Denebola"],
  // Crux
  ["Acrux", "Gacrux"], ["Mimosa", "Imai"],
  // Pegasus
  ["Markab", "Scheat"], ["Scheat", "Algenib"], ["Markab", "Enif"],
  // Centaurus
  ["Hadar", "Rigil Kentaurus"]
];

/**
 * Calculates Local Sidereal Time in degrees from UTC timestamp and observer longitude.
 */
export function calculateLST(epochMs, longitude) {
  const JD = epochMs / 86400000 + 2440587.5;
  const D = JD - 2451545.0;
  let GMST = (280.46061837 + 360.98564736629 * D) % 360;
  if (GMST < 0) GMST += 360;
  let LST = (GMST + longitude) % 360;
  if (LST < 0) LST += 360;
  return LST;
}

/**
 * Projects a celestial coordinate (RA, Dec) onto the circular planisphere disk.
 */
export function projectStar(raDeg, decDeg, lstDeg, latDeg, radius) {
  let ha = (lstDeg - raDeg) % 360;
  if (ha < 0) ha += 360;

  const haRad = (ha * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;
  const latRad = (latDeg * Math.PI) / 180;

  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  // Skip stars significantly below horizon
  if (alt < -0.05) return null;

  const cosAlt = Math.cos(alt);
  let cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * cosAlt);
  cosAz = Math.max(-1, Math.min(1, cosAz));

  let az = Math.acos(cosAz);
  if (Math.sin(haRad) > 0) az = 2 * Math.PI - az;

  // Zenith at center, horizon at circular edge
  const r = radius * (1 - alt / (Math.PI / 2));
  if (r > radius) return null;

  // In celestial cartography looking upwards:
  // North is Up (-y), South is Down (+y), East is Left (-x), West is Right (+x)
  const x = -r * Math.sin(az);
  const y = -r * Math.cos(az);
  return { x, y, alt, az, r };
}

/**
 * Deterministically generates background stars across the celestial sphere.
 */
export function getBackgroundStars(count = 420) {
  const bg = [];
  let seed = 987654321;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < count; i++) {
    const ra = rnd() * 360;
    const dec = Math.asin(rnd() * 2 - 1) * (180 / Math.PI);
    const mag = 2.5 + rnd() * 2.5;
    bg.push([`bg_${i}`, ra, dec, mag]);
  }
  return bg;
}
