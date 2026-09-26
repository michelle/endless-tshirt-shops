/**
 * Curated example places for the landing gallery and "surprise me".
 * Client-safe.
 */
import type { Design } from './design';

export type Preset = {
  design: Design;
  story: string;
};

export const PRESETS: Preset[] = [
  {
    design: {
      lat: 46.0207,
      lon: 7.6586,
      radiusKm: 10,
      label: 'The Matterhorn',
      caption: 'Four thousand metres of almost-vertical opinion.',
      date: '',
      palette: 'bone',
    },
    story: 'The summit you keep talking about.',
  },
  {
    design: {
      lat: 36.0544,
      lon: -112.1401,
      radiusKm: 25,
      label: 'Grand Canyon',
      caption: 'Two billion years, wearing well.',
      date: '',
      palette: 'clay',
    },
    story: 'Deep time, screenprinted by geology.',
  },
  {
    design: {
      lat: -22.9519,
      lon: -43.2105,
      radiusKm: 10,
      label: 'Rio de Janeiro',
      caption: 'Where the mountains walked into the sea.',
      date: '',
      palette: 'moss',
    },
    story: 'Granite peaks meeting the Atlantic.',
  },
  {
    design: {
      lat: 35.3606,
      lon: 138.7274,
      radiusKm: 25,
      label: 'Mount Fuji',
      caption: 'Perfectly conical. Rude, honestly.',
      date: '',
      palette: 'ink',
    },
    story: 'The most drawn mountain on Earth.',
  },
  {
    design: {
      lat: -44.6714,
      lon: 167.9242,
      radiusKm: 25,
      label: 'Fiordland',
      caption: 'Rain falls sideways here, and keeps going.',
      date: '',
      palette: 'alpine',
    },
    story: 'Glaciers carved a coastline, then left.',
  },
  {
    design: {
      lat: 64.1395,
      lon: -21.8952,
      radiusKm: 10,
      label: 'Reykjavík',
      caption: 'A small town between two continents.',
      date: '',
      palette: 'ember',
    },
    story: 'Rift valleys, lava fields, hot water.',
  },
  {
    design: {
      lat: -25.3444,
      lon: 131.0369,
      radiusKm: 25,
      label: 'Uluru',
      caption: 'One island. One rock. No argument.',
      date: '',
      palette: 'ember',
    },
    story: 'The red centre, in contour lines.',
  },
  {
    design: {
      lat: 46.5197,
      lon: 6.6323,
      radiusKm: 25,
      label: 'Lake Geneva',
      caption: 'Where the Alps flatten out to rest.',
      date: '',
      palette: 'alpine',
    },
    story: 'A shoreline worth wearing.',
  },
];

/** Six gallery picks (a spread of palettes and terrain). */
export const GALLERY_PRESETS = [PRESETS[0], PRESETS[1], PRESETS[2], PRESETS[3], PRESETS[4], PRESETS[6]];
