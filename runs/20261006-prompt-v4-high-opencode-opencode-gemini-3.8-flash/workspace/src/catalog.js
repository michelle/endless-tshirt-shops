export const CATALOG = {
  sku: 'GLOBAL-TEE-BC-3001',
  name: 'Bella + Canvas 3001 Unisex Jersey Tee',
  description: '100% combed ringspun cotton, premium soft-hand direct-to-garment print',
  priceCents: 3400, // $34.00 USD
  currency: 'usd',
  colors: {
    black: {
      name: 'Black',
      prodigiColor: 'black',
      hex: '#111827',
      recommendedThemes: ['gold', 'cyan', 'rose'],
    },
    navy: {
      name: 'Navy Blue',
      prodigiColor: 'navy blue',
      hex: '#0f172a',
      recommendedThemes: ['gold', 'cyan', 'rose'],
    },
    white: {
      name: 'White',
      prodigiColor: 'white',
      hex: '#f8fafc',
      recommendedThemes: ['noir'],
    },
  },
  sizes: ['s', 'm', 'l', 'xl', '2xl'],
  themes: {
    gold: {
      id: 'gold',
      name: 'Starlight Gold & Ivory',
      accent: '#F5D061',
      secondary: '#E8C15A',
      stars: '#FFFFFF',
      text: '#FFFFFF',
      grid: 'rgba(245, 208, 97, 0.25)',
      lines: 'rgba(245, 208, 97, 0.45)',
      glow: 'rgba(245, 208, 97, 0.7)',
      compatibleGarments: ['black', 'navy'],
    },
    cyan: {
      id: 'cyan',
      name: 'Astral Blue & Silver',
      accent: '#38BDF8',
      secondary: '#7DD3FC',
      stars: '#FFFFFF',
      text: '#F8FAFC',
      grid: 'rgba(56, 189, 248, 0.25)',
      lines: 'rgba(56, 189, 248, 0.45)',
      glow: 'rgba(56, 189, 248, 0.7)',
      compatibleGarments: ['black', 'navy'],
    },
    rose: {
      id: 'rose',
      name: 'Rose Gold Nebula',
      accent: '#F472B6',
      secondary: '#FDA4AF',
      stars: '#FFFFFF',
      text: '#FFF1F2',
      grid: 'rgba(244, 114, 182, 0.25)',
      lines: 'rgba(244, 114, 182, 0.45)',
      glow: 'rgba(244, 114, 182, 0.7)',
      compatibleGarments: ['black', 'navy'],
    },
    noir: {
      id: 'noir',
      name: 'Deep Midnight Noir',
      accent: '#0F172A',
      secondary: '#334155',
      stars: '#0F172A',
      text: '#0F172A',
      grid: 'rgba(15, 23, 42, 0.25)',
      lines: 'rgba(15, 23, 42, 0.45)',
      glow: 'rgba(15, 23, 42, 0.35)',
      compatibleGarments: ['white'],
    },
  },
  countries: [
    'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'NL', 'BE',
    'ES', 'IT', 'PT', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'JP', 'SG'
  ],
};

export function isValidColor(color) {
  return color && Object.prototype.hasOwnProperty.call(CATALOG.colors, color.toLowerCase());
}

export function isValidSize(size) {
  return size && CATALOG.sizes.includes(size.toLowerCase());
}

export function isValidTheme(theme) {
  return theme && Object.prototype.hasOwnProperty.call(CATALOG.themes, theme.toLowerCase());
}
