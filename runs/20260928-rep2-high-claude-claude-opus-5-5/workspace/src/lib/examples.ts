import { DEFAULT_DESIGN, type Design } from "./design";

export const HERO: Design = { ...DEFAULT_DESIGN };

export const EXAMPLES: { design: Design; caption: string }[] = [
  {
    design: {
      ...DEFAULT_DESIGN, title: "She Said Yes", message: "on the Pont des Arts", place: "Paris, France",
      lat: 48.8583, lon: 2.3375, tz: "Europe/Paris", when: "2022-09-17T21:40", shirt: "navy",
      layers: { lines: true, names: true, grid: false, planets: true },
    },
    caption: "A proposal in Paris — Jupiter was rising in the east.",
  },
  {
    design: {
      ...DEFAULT_DESIGN, title: "Hello, Little One", message: "the sky the night you arrived", place: "Sydney, Australia",
      lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney", when: "2024-03-02T03:15", shirt: "white",
      layers: { lines: true, names: false, grid: true, planets: true },
    },
    caption: "A 3:15 AM birth under the Southern Cross.",
  },
  {
    design: {
      ...DEFAULT_DESIGN, title: "Summit Night", message: "we made it to the top", place: "Mount Kilimanjaro, Tanzania",
      lat: -3.0674, lon: 37.3556, tz: "Africa/Dar_es_Salaam", when: "2023-08-12T04:50", shirt: "maroon",
      layers: { lines: true, names: false, grid: false, planets: true },
    },
    caption: "The sky from 5,895 m, just before sunrise.",
  },
];
