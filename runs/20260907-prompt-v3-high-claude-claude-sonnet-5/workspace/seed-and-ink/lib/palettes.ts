export type Palette = {
  key: string;
  name: string;
  colors: string[]; // hex, used by the generative art
  swatch: string; // representative hex for UI chips
};

export const PALETTES: Palette[] = [
  {
    key: 'midnight',
    name: 'Midnight Signal',
    colors: ['#6c5ce7', '#00cec9', '#0984e3', '#a29bfe', '#2d3436'],
    swatch: '#6c5ce7',
  },
  {
    key: 'citrus',
    name: 'Citrus Static',
    colors: ['#ff7675', '#fdcb6e', '#e17055', '#ffeaa7', '#d63031'],
    swatch: '#e17055',
  },
  {
    key: 'bloomfield',
    name: 'Bloomfield',
    colors: ['#ff9ff3', '#f368e0', '#1dd1a1', '#feca57', '#5f27cd'],
    swatch: '#ff6b9d',
  },
  {
    key: 'mono',
    name: 'Mono Ink',
    colors: ['#f5f5f5', '#c8c8c8', '#8a8a8a', '#3a3a3a', '#111111'],
    swatch: '#3a3a3a',
  },
  {
    key: 'deepsea',
    name: 'Deep Sea',
    colors: ['#00b894', '#0984e3', '#00cec9', '#2e86de', '#130f40'],
    swatch: '#0984e3',
  },
  {
    key: 'sunset',
    name: 'Last Light',
    colors: ['#ff6b6b', '#f8a5c2', '#feca57', '#ff9ff3', '#c44569'],
    swatch: '#ff6b6b',
  },
];

export function getPalette(key: string): Palette {
  return PALETTES.find((p) => p.key === key) ?? PALETTES[0];
}
