// Shirt mockup: renders a Bella+Canvas 3001-style tee in the chosen garment
// colour with the customer's design placed on the chest. The design string
// is the exact same SVG that becomes the print file.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function shade(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  const adj = (v: number) =>
    Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)));
  return `rgb(${adj(r)},${adj(g)},${adj(b)})`;
}

export interface ShirtMockProps {
  /** Garment hex swatch colour. */
  garmentHex: string;
  /** Full design SVG string from buildDesignSvg(). */
  designSvg: string;
  /** Unique id prefix so multiple mocks can coexist. */
  uid?: string;
}

export function buildShirtMockSvg({ garmentHex, designSvg, uid = 'nl' }: ShirtMockProps): string {
  // Place the design on the chest: nested <svg> scaled from print units.
  const placed = designSvg.replace(
    'width="4680" height="5790"',
    'x="332" y="252" width="336" height="415.7" style="filter:drop-shadow(0 3px 8px rgba(0,0,0,0.18))"'
  );

  const light = shade(garmentHex, 1.12);
  const mid = shade(garmentHex, 1.0);
  const dark = shade(garmentHex, 0.84);
  const darker = shade(garmentHex, 0.72);
  const isLightGarment =
    (hexToRgb(garmentHex)[0] + hexToRgb(garmentHex)[1] + hexToRgb(garmentHex)[2]) / 3 > 150;
  const seam = isLightGarment ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.12)';
  const hl = isLightGarment ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.07)';
  const shadow = 'rgba(0,0,0,0.20)';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="100%" height="100%">
  <defs>
    <linearGradient id="${uid}-g" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="0.45" stop-color="${mid}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
  </defs>
  <g>
    <path d="M408,90
      C430,142 570,142 592,90
      L700,124
      C742,138 774,168 790,208
      L846,352
      C854,374 846,394 824,402
      L714,442
      C698,448 686,442 680,428
      L700,842
      C702,872 684,890 654,892
      L346,892
      C316,890 298,872 300,842
      L320,428
      C314,442 302,448 286,442
      L176,402
      C154,394 146,374 154,352
      L210,208
      C226,168 258,138 300,124
      Z" fill="url(#${uid}-g)" stroke="${darker}" stroke-width="2"/>
    <path d="M404,84 C428,148 572,148 596,84 L592,90 C570,142 430,142 408,90 Z" fill="${darker}"/>
    <path d="M790,208 L846,352" fill="none" stroke="${hl}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
    <path d="M700,124 L790,208" fill="none" stroke="${hl}" stroke-width="2.5" opacity="0.6"/>
    <path d="M680,428 L700,842" fill="none" stroke="${shadow}" stroke-width="8" stroke-linecap="round"/>
    <path d="M320,428 L300,842" fill="none" stroke="${shadow}" stroke-width="8" stroke-linecap="round"/>
    <path d="M316,872 L684,872" stroke="${seam}" stroke-width="2" stroke-dasharray="7 6"/>
    <path d="M698,138 C688,240 678,340 680,428" fill="none" stroke="${seam}" stroke-width="2.5"/>
    <path d="M302,138 C312,240 322,340 320,428" fill="none" stroke="${seam}" stroke-width="2.5"/>
    <path d="M614,150 C640,300 650,520 646,860" fill="none" stroke="${hl}" stroke-width="6" stroke-linecap="round" opacity="0.5"/>
    <path d="M386,150 C364,300 354,520 356,860" fill="none" stroke="${shadow}" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
    ${placed}
  </g>
</svg>`;
}

export default function ShirtMock(props: ShirtMockProps) {
  const svg = buildShirtMockSvg(props);
  return <div className="nl-svg" dangerouslySetInnerHTML={{ __html: svg }} />;
}
