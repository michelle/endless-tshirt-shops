import {
  getGarment,
  getPalette,
  normalizeWord,
  SIZES,
  type Size,
} from './catalogue';

export type OrderInput = {
  word: string;
  paletteId: string;
  garmentColor: string;
  size: Size;
  darkGarment: boolean;
};

export function validateOrderInput(raw: unknown):
  | { ok: true; input: OrderInput }
  | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Invalid request body' };
  }
  const r = raw as Record<string, unknown>;

  const word = normalizeWord(typeof r.word === 'string' ? r.word : '');
  if (word.length < 1) return { ok: false, error: 'Give your shirt a word first' };

  const paletteId = typeof r.paletteId === 'string' ? r.paletteId : '';
  if (!getPalette(paletteId)) return { ok: false, error: 'Unknown palette' };

  const garmentColor =
    typeof r.garmentColor === 'string' ? r.garmentColor : '';
  const garment = getGarment(garmentColor);
  if (!garment) return { ok: false, error: 'Unknown garment color' };

  const size = typeof r.size === 'string' ? r.size.toLowerCase() : '';
  if (!(SIZES as readonly string[]).includes(size)) {
    return { ok: false, error: 'Unknown size' };
  }

  return {
    ok: true,
    input: {
      word,
      paletteId,
      garmentColor,
      size: size as Size,
      darkGarment: garment.dark,
    },
  };
}

export function inputFromMetadata(
  metadata: Record<string, string | undefined>,
): OrderInput | null {
  const result = validateOrderInput({
    word: metadata.word,
    paletteId: metadata.paletteId,
    garmentColor: metadata.garmentColor,
    size: metadata.size,
  });
  return result.ok ? result.input : null;
}
