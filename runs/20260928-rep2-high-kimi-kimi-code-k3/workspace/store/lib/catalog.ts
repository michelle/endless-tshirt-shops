export const STYLES = ['monolith', 'echo', 'heritage', 'arc'] as const;
export type StyleId = (typeof STYLES)[number];

export const SHIRTS: Record<string, { attr: string; hex: string; label: string }> = {
  white: { attr: 'white', hex: '#FFFFFF', label: 'White' },
  natural: { attr: 'natural', hex: '#E8E0CE', label: 'Natural' },
  grey: { attr: 'athletic grey heather', hex: '#9BA0A4', label: 'Grey' },
  black: { attr: 'black', hex: '#171717', label: 'Black' },
  navy: { attr: 'navy blue', hex: '#1F2A44', label: 'Navy' },
  olive: { attr: 'military green', hex: '#585B4C', label: 'Olive' },
};

export const INKS: Record<string, { hex: string; label: string }> = {
  jet: { hex: '#111111', label: 'Jet' },
  chalk: { hex: '#F7F3EA', label: 'Chalk' },
  crimson: { hex: '#C8102E', label: 'Crimson' },
  marigold: { hex: '#E8A13D', label: 'Marigold' },
  forest: { hex: '#2E5B3F', label: 'Forest' },
  sky: { hex: '#7FB3D5', label: 'Sky' },
  blush: { hex: '#E8B4B8', label: 'Blush' },
  violet: { hex: '#6C4F9E', label: 'Violet' },
};

export const SIZES = ['s', 'm', 'l', 'xl', '2xl', '3xl'] as const;

export const TEXT_RE = /^[A-Za-z0-9 &'!?.-]{1,14}$/;

export const PRICE_CENTS = 2900;
export const SHIPPING_CENTS = 499;

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Threshold chosen so spec'd bad combos are rejected: chalk/white (~1.03),
// chalk/natural (~1.12), jet/black (1.0), jet/navy (~1.34), jet/olive (~2.70).
export const MIN_CONTRAST = 2.75;

export function transformText(text: string, style: StyleId): string {
  if (style === 'heritage') {
    return text
      .toLowerCase()
      .replace(/(^|\s)([a-z0-9])/g, (_m, sp: string, ch: string) => sp + ch.toUpperCase());
  }
  return text.toUpperCase();
}

export interface Customization {
  text: string;
  style: StyleId;
  ink: string;
  shirt: string;
  size: string;
}

export function validateCustomization(input: unknown):
  | { ok: true; value: Customization }
  | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Invalid body' };
  }
  const { text, style, ink, shirt, size } = input as Record<string, unknown>;
  if (typeof text !== 'string') return { ok: false, error: 'Missing text' };
  const trimmed = text.trim();
  if (!TEXT_RE.test(trimmed)) {
    return {
      ok: false,
      error: 'Text must be 1-14 chars: letters, digits, spaces and & \' ! ? . - only',
    };
  }
  if (typeof style !== 'string' || !STYLES.includes(style as StyleId)) {
    return { ok: false, error: 'Unknown style' };
  }
  if (typeof ink !== 'string' || !INKS[ink]) return { ok: false, error: 'Unknown ink color' };
  if (typeof shirt !== 'string' || !SHIRTS[shirt]) return { ok: false, error: 'Unknown shirt color' };
  if (typeof size !== 'string' || !(SIZES as readonly string[]).includes(size)) {
    return { ok: false, error: 'Unknown size' };
  }
  const ratio = contrastRatio(INKS[ink].hex, SHIRTS[shirt].hex);
  if (ratio < MIN_CONTRAST) {
    return {
      ok: false,
      error: `${INKS[ink].label} ink won't read on a ${SHIRTS[shirt].label} shirt — pick a higher-contrast combo`,
    };
  }
  return { ok: true, value: { text: trimmed, style: style as StyleId, ink, shirt, size } };
}
