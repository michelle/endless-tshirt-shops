/**
 * Renders the print artwork as a high-resolution PNG (4677 × 5787 px,
 * the default front print area for the Gildan 5000 tee at ~300 DPI).
 *
 * We use Satori (JSX → SVG) for typographic layout and resvg-js for the
 * final PNG rasterization. Both are tiny and serverless-friendly.
 */

import type { ReactElement } from 'react';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import path from 'node:path';
import fs from 'node:fs';
import { PRINT_AREA_HEIGHT_PX, PRINT_AREA_WIDTH_PX } from './products';
import type { DesignConfig } from './types';

export interface DesignRenderInput {
  design: DesignConfig;
  inkColor: string;
  background: 'light' | 'dark';
}

const FONT_DIR_CANDIDATES = [
  path.join(process.cwd(), 'node_modules', '@fontsource'),
  path.join(process.cwd(), '..', 'node_modules', '@fontsource'),
];

function pickFontDir(pkg: string): string | null {
  for (const base of FONT_DIR_CANDIDATES) {
    const target = path.join(base, pkg, 'files');
    if (fs.existsSync(target)) return target;
  }
  return null;
}

interface LoadedFont { name: string; data: Buffer; weight: number; style: 'normal' | 'italic'; }

function loadFonts(): LoadedFont[] {
  const families: LoadedFont[] = [];
  const want: Array<{
    pkg: string;
    file: string;
    name: string;
    weight: number;
    style: 'normal' | 'italic';
  }> = [
    { pkg: 'cormorant-garamond', file: 'cormorant-garamond-latin-700-normal.woff', name: 'Cormorant Garamond', weight: 700, style: 'normal' },
    { pkg: 'cormorant-garamond', file: 'cormorant-garamond-latin-400-normal.woff', name: 'Cormorant Garamond', weight: 400, style: 'normal' },
    { pkg: 'inter',               file: 'inter-latin-400-normal.woff',               name: 'Inter',              weight: 400, style: 'normal' },
    { pkg: 'inter',               file: 'inter-latin-700-normal.woff',               name: 'Inter',              weight: 700, style: 'normal' },
    { pkg: 'jetbrains-mono',      file: 'jetbrains-mono-latin-700-normal.woff',       name: 'JetBrains Mono',     weight: 700, style: 'normal' },
    { pkg: 'jetbrains-mono',      file: 'jetbrains-mono-latin-400-normal.woff',       name: 'JetBrains Mono',     weight: 400, style: 'normal' },
  ];
  for (const w of want) {
    const dir = pickFontDir(w.pkg);
    if (!dir) continue;
    const file = path.join(dir, w.file);
    if (!fs.existsSync(file)) continue;
    families.push({ name: w.name, data: fs.readFileSync(file), weight: w.weight, style: w.style });
  }
  return families;
}

const FONTS = (() => {
  const g = globalThis as unknown as { __here_fonts?: LoadedFont[] };
  if (g.__here_fonts) return g.__here_fonts;
  const fonts = loadFonts();
  g.__here_fonts = fonts;
  return fonts;
})();

function latLng(value: number, kind: 'lat' | 'lng'): string {
  const dir = kind === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  const abs = Math.abs(value);
  return `${abs.toFixed(4)}° ${dir}`;
}

function dms(value: number, kind: 'lat' | 'lng'): string {
  const dir = kind === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = Math.floor((abs - deg) * 60);
  const sec = Math.round(((abs - deg) * 60 - min) * 60);
  return `${deg}° ${min.toString().padStart(2, '0')}′ ${sec.toString().padStart(2, '0')}″ ${dir}`;
}

interface DesignJSXArgs {
  design: DesignConfig;
  inkColor: string;
}

/** Build the design as JSX. Coordinates are intentionally in absolute px
 *  to keep proportions stable across label lengths. */
function buildDesignTree({ design, inkColor }: DesignJSXArgs): ReactElement {
  const width = PRINT_AREA_WIDTH_PX;   // 4677
  const height = PRINT_AREA_HEIGHT_PX; // 5787

  const label = (design.label || 'YOUR PLACE').toUpperCase();
  const city = (design.city || 'CITY, COUNTRY').toUpperCase();
  const yearText = design.year && design.year.trim().length > 0 ? `EST. ${design.year.trim().toUpperCase()}` : null;
  const personalName = design.personalName && design.personalName.trim().length > 0 ? design.personalName.trim() : null;

  // Sized at print resolution (px). Scaled by max label length to fit width.
  const labelFontPx = Math.round(Math.min(900, 4200 / Math.max(8, label.length) * 1.0));
  const titleVisualFontPx = Math.min(900, Math.max(380, label.length * 65));
  const cityFontPx = 250;
  const ruleHeightPx = 6;
  const coordFontPx = 520;       // monospace, must allow 11 chars in width
  const dmsFontPx = 175;
  const brandFontPx = 195;
  const personalFontPx = 600;
  const yearFontPx = 240;

  // Total vertical budget (height = 5787):
  //   top compass     ~580
  //   label           ~labelFontPx (lineheight 1)
  //   rule            6
  //   city            ~cityFontPx
  //   rule            6
  //   coords (2x)     2 * coordFontPx + small gap
  //   year/personal   ~600
  //   dms row + brand ~600
  // We'll lay out with gap() containers.

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        color: inkColor,
        backgroundColor: 'transparent',
        fontFamily: 'Inter',
        paddingTop: '420px',
      }}
    >
      {/* 1. Compass row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', position: 'relative', width: '100%' }}>
        {/* Outer ring */}
        <div
          style={{
            width: '300px', height: '300px',
            borderRadius: '50%',
            border: `10px solid ${inkColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '140px', height: '140px',
              borderRadius: '50%',
              border: `8px solid ${inkColor}`,
            }}
          />
        </div>
        {/* N triangle */}
        <div
          style={{
            position: 'absolute',
            top: '-90px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 0, height: 0,
              borderLeft: '40px solid transparent',
              borderRight: '40px solid transparent',
              borderBottom: `80px solid ${inkColor}`,
            }}
          />
        </div>
      </div>

      {/* 2. Headline label */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '180px',
          width: '92%',
        }}
      >
        <div
          style={{
            fontFamily: 'Cormorant Garamond',
            fontWeight: 700,
            fontSize: `${titleVisualFontPx}px`,
            lineHeight: 1.0,
            letterSpacing: '-0.005em',
            textAlign: 'center',
            color: inkColor,
            display: 'flex',
          }}
        >
          <span>{label}</span>
        </div>
      </div>

      {/* 3. Hairline */}
      <div style={{ width: '78%', height: `${ruleHeightPx}px`, backgroundColor: inkColor, opacity: 0.6, marginTop: '160px' }} />

      {/* 4. City */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '70px',
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: `${cityFontPx}px`,
          letterSpacing: '0.18em',
          color: inkColor,
          opacity: 0.9,
          textAlign: 'center',
          width: '92%',
        }}
      >
        <span>{city}</span>
      </div>

      {/* 5. Hairline */}
      <div style={{ width: '78%', height: `${ruleHeightPx}px`, backgroundColor: inkColor, opacity: 0.6, marginTop: '70px' }} />

      {/* 6. Coordinates */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '180px',
          gap: '90px',
          width: '92%',
        }}
      >
        <div
          style={{
            fontFamily: 'JetBrains Mono',
            fontWeight: 700,
            fontSize: `${coordFontPx}px`,
            lineHeight: 1.0,
            letterSpacing: '0.01em',
            color: inkColor,
            display: 'flex',
          }}
        >
          <span>{latLng(design.latitude, 'lat')}</span>
        </div>
        <div
          style={{
            fontFamily: 'JetBrains Mono',
            fontWeight: 700,
            fontSize: `${coordFontPx}px`,
            lineHeight: 1.0,
            letterSpacing: '0.01em',
            color: inkColor,
            display: 'flex',
          }}
        >
          <span>{latLng(design.longitude, 'lng')}</span>
        </div>
      </div>

      {/* 7. Year */}
      {yearText && (
        <div
          style={{
            display: 'flex',
            marginTop: '160px',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: `${yearFontPx}px`,
            letterSpacing: '0.22em',
            color: inkColor,
            opacity: 0.85,
          }}
        >
          <span>{yearText}</span>
        </div>
      )}

      {/* 8. Personal name */}
      {personalName && (
        <div
          style={{
            display: 'flex',
            marginTop: '60px',
            fontFamily: 'Cormorant Garamond',
            fontWeight: 700,
            fontSize: `${personalFontPx}px`,
            letterSpacing: '-0.005em',
            color: inkColor,
            textAlign: 'center',
            width: '92%',
          }}
        >
          <span>{personalName}</span>
        </div>
      )}

      {/* 9. Spacer */}
      <div style={{ flex: 1 }} />

      {/* 10. DMS readout (small mono) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '78%',
          fontFamily: 'JetBrains Mono',
          fontWeight: 400,
          fontSize: `${dmsFontPx}px`,
          letterSpacing: '0.04em',
          color: inkColor,
          opacity: 0.65,
        }}
      >
        <span>{dms(design.latitude, 'lat')}</span>
        <span>{dms(design.longitude, 'lng')}</span>
      </div>

      {/* 11. Brand mark */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '100px',
          marginTop: '80px',
          fontFamily: 'Inter',
          fontWeight: 700,
          fontSize: `${brandFontPx}px`,
          letterSpacing: '0.32em',
          color: inkColor,
        }}
      >
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: `8px solid ${inkColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Cormorant Garamond',
            fontWeight: 700,
            fontSize: '140px',
            color: inkColor,
          }}
        >
          <span>N</span>
        </div>
        <span>HERE  ·  WEAR YOUR PLACE</span>
      </div>
    </div>
  );
}

export interface RenderedDesign {
  png: Buffer;
  width: number;
  height: number;
}

let lastSvg: string | null = null;

export async function renderDesign(input: DesignRenderInput): Promise<RenderedDesign> {
  const { design, inkColor } = input;
  if (FONTS.length === 0) {
    throw new Error('No fonts bundled. Install @fontsource/* and run again.');
  }
  const tree = buildDesignTree({ design, inkColor });
  const svg = await satori(tree, {
    width: PRINT_AREA_WIDTH_PX,
    height: PRINT_AREA_HEIGHT_PX,
    fonts: FONTS.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight as any,
      style: f.style as any,
    })),
    embedFont: true,
  });
  lastSvg = svg;
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: PRINT_AREA_WIDTH_PX },
    background: 'transparent',
  });
  const pngData = resvg.render().asPng();
  return { png: Buffer.from(pngData), width: PRINT_AREA_WIDTH_PX, height: PRINT_AREA_HEIGHT_PX };
}

export function lastRenderedSvg(): string | null {
  return lastSvg;
}
