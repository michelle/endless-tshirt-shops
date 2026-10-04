// Shared t-shirt mockup geometry. Used by the browser preview and the
// server-side mockup renderer so they always match.

export const SHIRT_VIEWBOX = '0 0 600 700';

// Front-facing crew-neck tee outline.
export const SHIRT_PATH =
  'M250 132 L172 152 Q120 164 96 200 L58 296 Q50 318 74 328 L148 348 Q170 354 172 312 L172 600 Q172 622 194 622 L406 622 Q428 622 428 600 L428 312 Q430 354 452 348 L526 328 Q550 318 542 296 L504 200 Q480 164 428 152 L350 132 Q300 180 250 132 Z';

export const COLLAR_PATH = 'M250 132 Q300 180 350 132';

export const FOLD_PATHS = [
  'M232 214 Q228 400 238 596',
  'M368 214 Q372 400 362 596',
  'M120 186 Q150 224 172 250',
  'M480 186 Q450 224 428 250',
];

// Where the design canvas sits on the mockup, in mockup viewBox units.
// Sized to the Bella+Canvas 3001 front print area, centred on the chest.
export const DESIGN_BOX = { x: 200, y: 252, width: 200, height: 247 };

export function isLightColor(color: string): boolean {
  const c = color.toLowerCase();
  return c === '#f2f0ea' || c === '#ffffff' || c === '#fff';
}

export function shirtSvgString(color: string): string {
  const light = isLightColor(color);
  const stroke = light ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.16)';
  const shade = light ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.55)';
  const highlight = light ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.07)';
  const folds = FOLD_PATHS.map(
    (d, i) => `<path d="${d}" fill="none" stroke="${shade}" stroke-width="${i < 2 ? 6 : 5}" opacity="${i < 2 ? 0.24 : 0.2}" stroke-linecap="round"/>`,
  ).join('');
  return `<svg class="shirt" viewBox="${SHIRT_VIEWBOX}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fabric" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${highlight}"/>
        <stop offset="45%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="${shade}"/>
      </linearGradient>
      <radialGradient id="fabricShade" cx="50%" cy="34%" r="72%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.10)"/>
        <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>
      </radialGradient>
    </defs>
    <path d="${SHIRT_PATH}" fill="${color}" stroke="${stroke}" stroke-width="2.5"/>
    <path d="${COLLAR_PATH}" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="round" opacity="0.55"/>
    <path d="${SHIRT_PATH}" fill="url(#fabric)"/>
    <path d="${SHIRT_PATH}" fill="url(#fabricShade)"/>
    ${folds}
  </svg>`;
}

export function stripSvgWrapper(svg: string): string {
  return svg
    .replace(/^<\?xml[^>]*\?>\s*/, '')
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');
}
