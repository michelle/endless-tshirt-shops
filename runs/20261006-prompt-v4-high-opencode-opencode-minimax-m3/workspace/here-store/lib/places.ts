/** A small curated list of places to seed the location picker. */
export interface PresetPlace {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  /* emoji used for tile icons */
  glyph?: string;
}

export const PRESET_PLACES: PresetPlace[] = [
  { id: 'paris',      city: 'Paris',         country: 'France',       lat: 48.8566,  lng:   2.3522, glyph: '🗼' },
  { id: 'nyc',        city: 'New York',      country: 'USA',          lat: 40.7128,  lng: -74.0060, glyph: '🗽' },
  { id: 'tokyo',      city: 'Tokyo',         country: 'Japan',        lat: 35.6762,  lng: 139.6503, glyph: '🗾' },
  { id: 'london',     city: 'London',        country: 'UK',           lat: 51.5074,  lng:  -0.1278, glyph: '🎡' },
  { id: 'sf',         city: 'San Francisco', country: 'USA',          lat: 37.7749,  lng:-122.4194, glyph: '🌉' },
  { id: 'rome',       city: 'Rome',          country: 'Italy',        lat: 41.9028,  lng:  12.4964, glyph: '🏛️' },
  { id: 'barcelona',  city: 'Barcelona',     country: 'Spain',        lat: 41.3851,  lng:   2.1734, glyph: '⛪' },
  { id: 'capetown',   city: 'Cape Town',     country: 'South Africa', lat: -33.9249, lng:  18.4241, glyph: '🌊' },
  { id: 'reykjavik',  city: 'Reykjavík',     country: 'Iceland',      lat: 64.1466,  lng: -21.9426, glyph: '🌋' },
  { id: 'auckland',   city: 'Auckland',      country: 'New Zealand',  lat: -36.8485, lng: 174.7633, glyph: '🌿' },
  { id: 'rio',        city: 'Rio de Janeiro',country: 'Brazil',       lat: -22.9068, lng: -43.1729, glyph: '🏖️' },
  { id: 'marrakech',  city: 'Marrakech',     country: 'Morocco',      lat: 31.6295,  lng:  -7.9811, glyph: '🕌' },
];

/** A small set of label presets to make building a shirt fast. */
export const LABEL_PRESETS = [
  'WHERE WE MET',
  'HOME',
  'OUR FIRST KISS',
  'SAID YES',
  'SAID I DO',
  'THE BEGINNING',
  'WHERE I BELONG',
  'NEVER FORGET',
  'BUILT HERE',
  'ROOTS',
  'I CAME FROM',
  'WHERE IT STARTED',
  'STILL THINKING OF',
  'THE ONE PLACE',
  'A STORY BEGINS',
  'CARRY ME BACK',
];
