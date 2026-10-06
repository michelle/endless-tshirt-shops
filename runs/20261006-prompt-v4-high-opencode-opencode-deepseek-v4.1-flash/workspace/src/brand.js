// Echoform brand system: palette, garments, typography, copy.
// The concept: a one-of-one "soundprint" generated from the customer's own
// words, printed with DTG (full-colour, no minimums, no setup cost).

export const BRAND = {
  name: 'ECHOFORM',
  tagline: 'The shape of your voice.',
  blurb:
    'A one-of-one soundprint rendered from your own words. Choose a phrase, ' +
    'we turn it into a unique waveform and print it to order on a soft Bella+Canvas tee.',
};

// Ink themes. `a`/`b` are the gradient endpoints for the waveform; `ink` is the
// primary text colour; `muted` is used for secondary type.
export const THEMES = {
  signal: {
    id: 'signal',
    name: 'Signal',
    a: '#7CF7E4',
    b: '#37B6FF',
    ink: '#EAFDFF',
    muted: 'rgba(234,253,255,0.62)',
    swatch: ['#7CF7E4', '#37B6FF'],
  },
  solar: {
    id: 'solar',
    name: 'Solar',
    a: '#FFD36E',
    b: '#FF6B3D',
    ink: '#FFF3E0',
    muted: 'rgba(255,243,224,0.62)',
    swatch: ['#FFD36E', '#FF6B3D'],
  },
  ultra: {
    id: 'ultra',
    name: 'Ultraviolet',
    a: '#C7A8FF',
    b: '#FF74D4',
    ink: '#F4ECFF',
    muted: 'rgba(244,236,255,0.62)',
    swatch: ['#C7A8FF', '#FF74D4'],
  },
  ivory: {
    id: 'ivory',
    name: 'Ivory',
    a: '#FBF3E4',
    b: '#E3CFA9',
    ink: '#FBF3E4',
    muted: 'rgba(251,243,228,0.62)',
    swatch: ['#FBF3E4', '#E3CFA9'],
  },
  mono: {
    id: 'mono',
    name: 'Studio White',
    a: '#FFFFFF',
    b: '#FFFFFF',
    ink: '#FFFFFF',
    muted: 'rgba(255,255,255,0.6)',
    swatch: ['#FFFFFF', '#D9D9D9'],
  },
  moss: {
    id: 'moss',
    name: 'Moss',
    a: '#C8E6A0',
    b: '#4FA36B',
    ink: '#E9F7DD',
    muted: 'rgba(233,247,221,0.62)',
    swatch: ['#C8E6A0', '#4FA36B'],
  },
  ink: {
    id: 'ink',
    name: 'Ink',
    a: '#1C1C1C',
    b: '#4A4A4A',
    ink: '#161616',
    muted: 'rgba(22,22,22,0.6)',
    swatch: ['#1C1C1C', '#4A4A4A'],
  },
};

// Garment colours mapped to Prodigi's Bella+Canvas 3001 colour names.
export const GARMENTS = {
  black: { id: 'black', name: 'Black', hex: '#161616', pro: 'black', dark: true, defaultTheme: 'signal' },
  navy: { id: 'navy', name: 'Navy', hex: '#1B2440', pro: 'navy blue', dark: true, defaultTheme: 'signal' },
  forest: { id: 'forest', name: 'Forest', hex: '#1E3326', pro: 'forest green', dark: true, defaultTheme: 'solar' },
  maroon: { id: 'maroon', name: 'Maroon', hex: '#3A1E22', pro: 'maroon', dark: true, defaultTheme: 'ivory' },
  charcoal: { id: 'charcoal', name: 'Charcoal', hex: '#34373B', pro: 'dark heather grey', dark: true, defaultTheme: 'mono' },
  cream: { id: 'cream', name: 'Cream', hex: '#EDE6D6', pro: 'cream', dark: false, defaultTheme: 'ink' },
  white: { id: 'white', name: 'White', hex: '#F4F4F2', pro: 'white', dark: false, defaultTheme: 'ink' },
  athletic: { id: 'athletic', name: 'Athletic Grey', hex: '#B9BDC1', pro: 'athletic grey heather', dark: false, defaultTheme: 'ink' },
};

export const SIZES = ['s', 'm', 'l', 'xl', '2xl', '3xl'];

export const DEFAULT_DESIGN = {
  message: 'Always look up',
  dedication: '',
  theme: 'signal',
  garment: 'black',
  size: 'm',
  variant: 0,
};

export function resolveTheme(id, garment) {
  if (id && THEMES[id]) return THEMES[id];
  const g = GARMENTS[garment];
  return THEMES[g ? g.defaultTheme : 'signal'];
}
