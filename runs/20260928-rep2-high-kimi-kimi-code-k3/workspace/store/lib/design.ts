import { transformText, type StyleId } from './catalog';

export type FontId = 'anton' | 'archivo' | 'baskerville';

export const FONT_CSS: Record<FontId, string> = {
  anton: "'Anton', sans-serif",
  archivo: "'Archivo Black', sans-serif",
  baskerville: "'Libre Baskerville', serif",
};

export const FONT_FILES: Record<FontId, string> = {
  anton: 'Anton-Regular.ttf',
  archivo: 'ArchivoBlack-Regular.ttf',
  baskerville: 'LibreBaskerville-Bold.ttf',
};

export type DesignElement =
  | {
      kind: 'text';
      text: string;
      font: FontId;
      size: number;
      x: number; // horizontal center of the run
      y: number; // baseline
      opacity: number;
      rotate?: number; // degrees, applied about (x, y)
      letterSpacing?: number; // px, added between glyphs
    }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; opacity: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; opacity: number };

// Approximate average glyph advance as a fraction of font size, per font.
// Used only to pick sizes; both renderers use the same numbers so they agree.
const ADVANCE: Record<FontId, number> = {
  anton: 0.52,
  archivo: 0.68,
  baskerville: 0.56,
};

export interface DesignInput {
  text: string;
  style: StyleId;
  width: number;
  height: number;
}

// Single source of truth for the layout of each style. Both the client
// preview (SVG <text>) and the print renderer (opentype.js -> <path>)
// consume the elements returned here.
export function designElements({ text, style, width, height }: DesignInput): DesignElement[] {
  const t = transformText(text, style);
  const cx = width / 2;
  const cy = height * 0.45;
  const aw = width * 0.86; // available width
  const ah = height * 0.66; // available height

  switch (style) {
    case 'monolith': {
      const chars = t.split('');
      const cols = chars.length > 7 ? 2 : 1;
      const perCol = Math.ceil(chars.length / cols);
      const lineH = 0.98;
      const gap = width * 0.07;
      const colW = (aw - (cols - 1) * gap) / cols;
      const size = Math.min(ah / (perCol * lineH), colW / ADVANCE.archivo);
      const charW = ADVANCE.archivo * size;
      const blockH = perCol * size * lineH;
      const topBaseline = cy - blockH / 2 + size * 0.78;
      return chars.map((ch, i) => {
        const col = Math.floor(i / perCol);
        const row = i % perCol;
        const x = cx + (col - (cols - 1) / 2) * (charW + gap);
        return {
          kind: 'text' as const,
          text: ch,
          font: 'archivo' as const,
          size,
          x,
          y: topBaseline + row * size * lineH,
          opacity: 1,
        };
      });
    }
    case 'echo': {
      const n = Math.max(t.length, 1);
      const size = Math.min((aw * 0.95) / (n * ADVANCE.anton), ah / (5 * 0.92));
      const pitch = size * 0.92;
      const midBaseline = cy + size * 0.34;
      const rows: { off: number; opacity: number }[] = [
        { off: -2, opacity: 0.15 },
        { off: -1, opacity: 0.6 },
        { off: 0, opacity: 1 },
        { off: 1, opacity: 0.6 },
        { off: 2, opacity: 0.15 },
      ];
      return rows.map((r) => ({
        kind: 'text' as const,
        text: t,
        font: 'anton' as const,
        size,
        x: cx,
        y: midBaseline + r.off * pitch,
        opacity: r.opacity,
      }));
    }
    case 'heritage': {
      const n = Math.max(t.length, 1);
      const size = Math.min((aw * 0.72) / (n * ADVANCE.baskerville), ah * 0.32);
      const wordW = n * ADVANCE.baskerville * size;
      const baseline = cy - size * 0.1;
      const ruleW = wordW + width * 0.06;
      const ruleH = Math.max(width * 0.0032, 5);
      const ruleGap = size * 0.34;
      const topRuleY = baseline - size * 0.74 - ruleGap - ruleH;
      const bottomRuleY = baseline + ruleGap;
      const tagSize = size * 0.26;
      const els: DesignElement[] = [
        { kind: 'rect', x: cx - ruleW / 2, y: topRuleY, w: ruleW, h: ruleH, opacity: 1 },
        { kind: 'rect', x: cx - ruleW / 2, y: bottomRuleY, w: ruleW, h: ruleH, opacity: 1 },
        {
          kind: 'text',
          text: t,
          font: 'baskerville',
          size,
          x: cx,
          y: baseline,
          opacity: 1,
        },
        {
          kind: 'text',
          text: 'Nº 1 OF 1',
          font: 'baskerville',
          size: tagSize,
          x: cx,
          y: bottomRuleY + ruleH + tagSize * 1.9,
          opacity: 1,
          letterSpacing: tagSize * 0.34,
        },
      ];
      return els;
    }
    case 'arc': {
      const chars = t.split('');
      const n = chars.length;
      const track = 1.15; // extra tracking between glyphs along the arc
      const spread = Math.min(Math.max(n * 0.16, 0.35), 1.25); // radians
      let size = Math.min(width * 0.18, ah * 0.34);
      // Keep the whole arc (glyph extents included) within ~78% of the width.
      for (let i = 0; i < 3; i++) {
        const arcLen = n * size * ADVANCE.anton * track;
        const chord = arcLen * (Math.sin(spread / 2) / (spread / 2));
        if (chord <= width * 0.72) break;
        size *= (width * 0.72) / chord;
      }
      const arcLen = n * size * ADVANCE.anton * track;
      const radius = arcLen / spread;
      const step = spread / n;
      const arcRise = radius * (1 - Math.cos(spread / 2));
      const circleCenterY = cy - arcRise / 2 + radius - size * 0.15;
      const els: DesignElement[] = chars.map((ch, i) => {
        const a = -spread / 2 + (i + 0.5) * step;
        return {
          kind: 'text' as const,
          text: ch,
          font: 'anton' as const,
          size,
          x: cx + radius * Math.sin(a),
          y: circleCenterY - radius * Math.cos(a),
          opacity: 1,
          rotate: (a * 180) / Math.PI,
        };
      });
      const lowestY = circleCenterY - radius * Math.cos(spread / 2);
      els.push({
        kind: 'circle',
        cx,
        cy: lowestY + size * 0.95,
        r: size * 0.1,
        opacity: 1,
      });
      return els;
    }
  }
}
