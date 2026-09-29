// A compact catalog of bright stars (name, right ascension in hours,
// declination in degrees, apparent magnitude) plus constellation line
// definitions. Enough to render a recognisable, genuinely-positioned night sky.

export interface Star {
  name: string;
  ra: number; // hours
  dec: number; // degrees
  mag: number; // apparent magnitude
}

export const STARS: Star[] = [
  { name: "Sirius", ra: 6.752, dec: -16.716, mag: -1.46 },
  { name: "Canopus", ra: 6.399, dec: -52.696, mag: -0.74 },
  { name: "Arcturus", ra: 14.261, dec: 19.182, mag: -0.05 },
  { name: "Vega", ra: 18.616, dec: 38.784, mag: 0.03 },
  { name: "Capella", ra: 5.278, dec: 45.998, mag: 0.08 },
  { name: "Rigel", ra: 5.242, dec: -8.202, mag: 0.13 },
  { name: "Procyon", ra: 7.655, dec: 5.225, mag: 0.34 },
  { name: "Betelgeuse", ra: 5.919, dec: 7.407, mag: 0.5 },
  { name: "Achernar", ra: 1.629, dec: -57.237, mag: 0.46 },
  { name: "Hadar", ra: 14.064, dec: -60.373, mag: 0.61 },
  { name: "Altair", ra: 19.846, dec: 8.868, mag: 0.76 },
  { name: "Acrux", ra: 12.443, dec: -63.099, mag: 0.77 },
  { name: "Aldebaran", ra: 4.599, dec: 16.509, mag: 0.85 },
  { name: "Antares", ra: 16.49, dec: -26.432, mag: 0.96 },
  { name: "Spica", ra: 13.42, dec: -11.161, mag: 0.97 },
  { name: "Pollux", ra: 7.755, dec: 28.026, mag: 1.14 },
  { name: "Fomalhaut", ra: 22.961, dec: -29.622, mag: 1.16 },
  { name: "Deneb", ra: 20.69, dec: 45.28, mag: 1.25 },
  { name: "Mimosa", ra: 12.796, dec: -59.689, mag: 1.25 },
  { name: "Regulus", ra: 10.14, dec: 11.967, mag: 1.35 },
  { name: "Adhara", ra: 6.976, dec: -28.972, mag: 1.5 },
  { name: "Castor", ra: 7.577, dec: 31.888, mag: 1.58 },
  { name: "Shaula", ra: 17.56, dec: -37.104, mag: 1.62 },
  { name: "Bellatrix", ra: 5.418, dec: 6.35, mag: 1.64 },
  { name: "Elnath", ra: 5.439, dec: 28.608, mag: 1.65 },
  { name: "Miaplacidus", ra: 9.22, dec: -69.717, mag: 1.68 },
  { name: "Alnilam", ra: 5.603, dec: -1.202, mag: 1.69 },
  { name: "Alnair", ra: 22.138, dec: -46.961, mag: 1.73 },
  { name: "Alnitak", ra: 5.678, dec: -1.943, mag: 1.77 },
  { name: "Alioth", ra: 12.9, dec: 55.96, mag: 1.77 },
  { name: "Dubhe", ra: 11.062, dec: 61.751, mag: 1.79 },
  { name: "Mirfak", ra: 3.406, dec: 49.861, mag: 1.8 },
  { name: "Wezen", ra: 7.14, dec: -26.393, mag: 1.84 },
  { name: "Sargas", ra: 17.622, dec: -42.998, mag: 1.86 },
  { name: "Kaus Australis", ra: 18.402, dec: -34.385, mag: 1.85 },
  { name: "Avior", ra: 8.375, dec: -59.51, mag: 1.86 },
  { name: "Alkaid", ra: 13.792, dec: 49.313, mag: 1.86 },
  { name: "Menkalinan", ra: 5.995, dec: 44.947, mag: 1.9 },
  { name: "Atria", ra: 16.812, dec: -69.028, mag: 1.91 },
  { name: "Alhena", ra: 6.628, dec: 16.399, mag: 1.92 },
  { name: "Peacock", ra: 20.427, dec: -56.735, mag: 1.94 },
  { name: "Mirzam", ra: 6.378, dec: -17.956, mag: 1.98 },
  { name: "Alphard", ra: 9.46, dec: -8.659, mag: 1.98 },
  { name: "Polaris", ra: 2.53, dec: 89.264, mag: 1.98 },
  { name: "Hamal", ra: 2.12, dec: 23.462, mag: 2.0 },
  { name: "Diphda", ra: 0.727, dec: -17.987, mag: 2.04 },
  { name: "Mizar", ra: 13.399, dec: 54.925, mag: 2.23 },
  { name: "Nunki", ra: 18.921, dec: -26.297, mag: 2.05 },
  { name: "Menkent", ra: 14.111, dec: -36.37, mag: 2.06 },
  { name: "Alpheratz", ra: 0.139, dec: 29.09, mag: 2.06 },
  { name: "Rasalhague", ra: 17.582, dec: 12.56, mag: 2.08 },
  { name: "Kochab", ra: 14.844, dec: 74.155, mag: 2.08 },
  { name: "Saiph", ra: 5.797, dec: -9.67, mag: 2.09 },
  { name: "Denebola", ra: 11.818, dec: 14.572, mag: 2.11 },
  { name: "Algol", ra: 3.136, dec: 40.956, mag: 2.12 },
  { name: "Muhlifain", ra: 12.69, dec: -48.96, mag: 2.15 },
  { name: "Aspidiske", ra: 9.284, dec: -59.275, mag: 2.21 },
  { name: "Suhail", ra: 9.133, dec: -43.432, mag: 2.21 },
  { name: "Alphecca", ra: 15.578, dec: 26.715, mag: 2.23 },
  { name: "Mintaka", ra: 5.533, dec: -0.299, mag: 2.23 },
  { name: "Sadr", ra: 20.371, dec: 40.257, mag: 2.23 },
  { name: "Eltanin", ra: 17.943, dec: 51.489, mag: 2.24 },
  { name: "Schedar", ra: 0.675, dec: 56.537, mag: 2.24 },
  { name: "Naos", ra: 8.06, dec: -40.003, mag: 2.25 },
  { name: "Almach", ra: 2.064, dec: 42.33, mag: 2.26 },
  { name: "Caph", ra: 0.152, dec: 59.15, mag: 2.28 },
  { name: "Izar", ra: 14.75, dec: 27.074, mag: 2.35 },
  { name: "Dschubba", ra: 16.003, dec: -22.622, mag: 2.29 },
  { name: "Larawag", ra: 17.72, dec: -40.0, mag: 2.3 },
  { name: "Merak", ra: 11.031, dec: 56.382, mag: 2.37 },
  { name: "Ankaa", ra: 0.438, dec: -42.306, mag: 2.38 },
  { name: "Gienah", ra: 20.77, dec: 33.97, mag: 2.46 },
  { name: "Enif", ra: 21.736, dec: 9.875, mag: 2.39 },
  { name: "Scheat", ra: 23.062, dec: 28.083, mag: 2.42 },
  { name: "Aludra", ra: 7.401, dec: -29.303, mag: 2.45 },
  { name: "Markab", ra: 23.079, dec: 15.205, mag: 2.48 },
  { name: "Phecda", ra: 11.897, dec: 53.695, mag: 2.44 },
  { name: "Megrez", ra: 12.255, dec: 57.033, mag: 3.31 },
  { name: "Ruchbah", ra: 1.43, dec: 60.235, mag: 2.68 },
  { name: "Segin", ra: 1.91, dec: 63.67, mag: 3.35 },
  { name: "Gamma Cas", ra: 0.945, dec: 60.717, mag: 2.47 },
  { name: "Meissa", ra: 5.59, dec: 9.934, mag: 3.39 },
  { name: "Algieba", ra: 10.333, dec: 19.842, mag: 2.08 },
  { name: "Albireo", ra: 19.512, dec: 27.96, mag: 3.05 },
  { name: "Algenib", ra: 0.22, dec: 15.184, mag: 2.83 },
  { name: "Mirach", ra: 1.162, dec: 35.621, mag: 2.05 },
  { name: "Gacrux", ra: 12.519, dec: -57.113, mag: 1.64 },
];

// Constellation line segments, referenced by star name.
export const CONSTELLATIONS: [string, string][] = [
  // Orion
  ["Meissa", "Bellatrix"],
  ["Bellatrix", "Betelgeuse"],
  ["Betelgeuse", "Alnitak"],
  ["Alnitak", "Alnilam"],
  ["Alnilam", "Mintaka"],
  ["Mintaka", "Betelgeuse"],
  ["Alnitak", "Saiph"],
  ["Saiph", "Rigel"],
  ["Rigel", "Mintaka"],
  ["Meissa", "Alnitak"],
  // Ursa Major (Big Dipper)
  ["Dubhe", "Merak"],
  ["Merak", "Phecda"],
  ["Phecda", "Megrez"],
  ["Megrez", "Alioth"],
  ["Alioth", "Mizar"],
  ["Mizar", "Alkaid"],
  ["Megrez", "Dubhe"],
  // Cassiopeia
  ["Caph", "Schedar"],
  ["Schedar", "Gamma Cas"],
  ["Gamma Cas", "Ruchbah"],
  ["Ruchbah", "Segin"],
  // Cygnus
  ["Deneb", "Sadr"],
  ["Sadr", "Gienah"],
  ["Sadr", "Albireo"],
  ["Gienah", "Albireo"],
  // Taurus
  ["Aldebaran", "Elnath"],
  // Leo
  ["Regulus", "Algieba"],
  ["Algieba", "Denebola"],
  // Scorpius
  ["Antares", "Dschubba"],
  // Canis Major
  ["Sirius", "Mirzam"],
  ["Sirius", "Wezen"],
  ["Wezen", "Adhara"],
  ["Adhara", "Aludra"],
  // Gemini
  ["Castor", "Pollux"],
  // Pegasus (Great Square)
  ["Alpheratz", "Scheat"],
  ["Scheat", "Markab"],
  ["Markab", "Algenib"],
  ["Algenib", "Alpheratz"],
  // Andromeda
  ["Alpheratz", "Mirach"],
  ["Mirach", "Almach"],
  // Southern Cross
  ["Acrux", "Mimosa"],
  ["Mimosa", "Gacrux"],
];

export const STAR_BY_NAME: Record<string, Star> = Object.fromEntries(
  STARS.map((s) => [s.name, s])
);
