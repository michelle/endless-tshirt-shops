import { z } from 'zod';
const printable = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[\x20-\x7EÀ-ÿ]+$/, 'Use Latin letters, numbers and punctuation.');
export const designSchema = z
  .object({
    headline: printable(24),
    city: printable(28),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
        'Choose a valid date.',
      ),
    tracks: z.array(printable(30)).length(3),
    palette: z.enum(['electric', 'heat', 'ultraviolet']),
    seed: z.number().int().min(1).max(999999),
  })
  .strict();
export const orderSchema = z
  .object({
    design: designSchema,
    size: z.enum(['s', 'm', 'l', 'xl', '2xl', '3xl']),
    quantity: z.number().int().min(1).max(5),
    approved: z.literal(true),
    requestId: z.string().uuid(),
  })
  .strict();
export type Design = z.infer<typeof designSchema>;
export const initialDesign: Design = {
  headline: 'THE GOOD YEARS',
  city: 'BROOKLYN, NY',
  date: '2026-09-19',
  tracks: [
    'Late nights & early flights',
    'The people who stayed',
    'Everything still to come',
  ],
  palette: 'electric',
  seed: 27182,
};
export const palettes = {
  electric: { name: 'Electric citrus', a: '#e0ff62', b: '#5fe8c6' },
  heat: { name: 'Heat wave', a: '#ffac5b', b: '#ff5b9b' },
  ultraviolet: { name: 'Ultraviolet', a: '#c5a6ff', b: '#81d8ff' },
};
export const PRICE = 4200;
export const SHIPPING = 600;
export const SKU = 'GLOBAL-TEE-BC-3001';
export function escapeXml(s: string) {
  return s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
}
export type TextRenderer = (
  text: string,
  x: number,
  y: number,
  size: number,
  font: 'display' | 'mono',
  color: string,
  maxWidth?: number,
) => string;
export const svgText: TextRenderer = (
  text,
  x,
  y,
  size,
  font,
  color,
  maxWidth,
) =>
  `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="${font === 'display' ? 'AH Display' : 'AH Mono'}" text-anchor="middle" ${maxWidth ? `textLength="${Math.min(maxWidth, text.length * size * (font === 'display' ? 0.46 : 0.6))}" lengthAdjust="spacingAndGlyphs"` : ''}>${escapeXml(text)}</text>`;
export function artwork(d: Design, text: TextRenderer = svgText) {
  const p = palettes[d.palette];
  let seed = d.seed;
  for (const c of d.headline + d.city + d.date + d.tracks.join(''))
    seed = (Math.imul(seed, 31) + c.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const phase = rand() * 6.28;
  const rings = Array.from({ length: 35 }, (_, i) => {
    const radius = 30 + i * 5.4;
    const pts = Array.from({ length: 150 }, (_, j) => {
      const a = (j / 150) * Math.PI * 2;
      const r =
        radius +
        Math.sin(a * 5 + phase + i * 0.13) * (9 + i * 0.2) +
        Math.sin(a * 3 - i * 0.15) * 7;
      return `${(390 + Math.cos(a) * r * 1.35).toFixed(1)},${(419 + Math.sin(a) * r * 0.88).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="url(#ink)" stroke-width="2.5" opacity="${0.55 + i / 80}"/>`;
  }).join('');
  const date = new Date(d.date + 'T12:00:00Z')
    .toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4680" height="5790" viewBox="0 0 780 965"><defs><linearGradient id="ink" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient></defs>${text('A F T E R  H O U R S  P R E S E N T S', 390, 88, 16, 'mono', p.a, 610)}${text(d.headline.toUpperCase(), 390, 176, 83, 'display', p.a, 670)}${text('ONE NIGHT. YOUR WHOLE LIFE.', 390, 212, 18, 'mono', p.a, 580)}${rings}${text('THE PERSONAL SETLIST', 390, 658, 17, 'mono', p.a, 560)}${d.tracks.map((t, i) => text(`0${i + 1}  ${t.toUpperCase()}`, 390, 696 + i * 34, 19, 'mono', '#f1f0e7', 630)).join('')}<path d="M110 808H670" stroke="${p.a}" stroke-width="2"/>${text(d.city.toUpperCase(), 390, 848, 30, 'display', p.a, 600)}${text(date + '  /  ONE OF ONE', 390, 883, 18, 'mono', p.a, 600)}${text('NO ENCORE NEEDED.', 390, 922, 13, 'mono', '#f1f0e7', 500)}</svg>`;
}
