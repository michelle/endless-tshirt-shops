/**
 * Client-safe palette definitions (no Node imports) — shared by the studio UI
 * and the server-side renderer.
 */
export type Palette = {
  id: string;
  name: string;
  /** sky gradient: top (flat band behind the moon), middle, bottom */
  c1: string;
  c2: string;
  c3: string;
  /** star colour */
  star: string;
  /** constellation / accent colour */
  accent: string;
  moonLight: string;
  moonDark: string;
  /** primary text colour */
  ink: string;
  /** secondary text colour */
  soft: string;
};

export const PALETTES: Palette[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    c1: '#0B1026',
    c2: '#1B2450',
    c3: '#05070F',
    star: '#EAF2FF',
    accent: '#8FB8FF',
    moonLight: '#F6EEDD',
    moonDark: '#1A2140',
    ink: '#F2F5FF',
    soft: '#C9D6F7',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    c1: '#071A1C',
    c2: '#0E3B3E',
    c3: '#04100F',
    star: '#EFFFF8',
    accent: '#7FE3C0',
    moonLight: '#F1F6E9',
    moonDark: '#103230',
    ink: '#EFFBF5',
    soft: '#BFE8D8',
  },
  {
    id: 'ember',
    name: 'Ember',
    c1: '#1A0B10',
    c2: '#4A1420',
    c3: '#0D0507',
    star: '#FFF1E0',
    accent: '#F0A35E',
    moonLight: '#FFEFD8',
    moonDark: '#3A1320',
    ink: '#FFF2E8',
    soft: '#EFC4AE',
  },
  {
    id: 'rosewood',
    name: 'Rosewood',
    c1: '#170D1A',
    c2: '#3E2147',
    c3: '#0B060D',
    star: '#FFF0F8',
    accent: '#E7A8C8',
    moonLight: '#FBEFF6',
    moonDark: '#33203C',
    ink: '#FBF1F8',
    soft: '#DDB9CE',
  },
  {
    id: 'nocturne',
    name: 'Nocturne',
    c1: '#0C0D10',
    c2: '#23262C',
    c3: '#050506',
    star: '#F4F4F0',
    accent: '#C9CDD6',
    moonLight: '#F4F4F0',
    moonDark: '#1C1E23',
    ink: '#F2F3F5',
    soft: '#B9BDC6',
  },
];

export const PLACE_MAX = 40;
export const CAPTION_MAX = 60;
