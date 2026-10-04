// Browser text renderer for the live preview. Uses web fonts via SVG <text>,
// so the bundle stays light (no font outline parsing on the client).
import type { TextRenderer, TextSpec } from './design-svg';

const FAMILY: Record<'display' | 'sans', string> = {
  display: "'Playfair Display', Georgia, serif",
  sans: "'Montserrat', system-ui, sans-serif",
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] as string));
}

export const previewTextRenderer: TextRenderer = {
  render(text: string, spec: TextSpec, x: number, y: number): string {
    return `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FAMILY[spec.font]}" font-size="${spec.size}" font-weight="${spec.weight}" letter-spacing="${spec.tracking}" fill="${spec.fill}" opacity="${spec.opacity}">${esc(text)}</text>`;
  },
};
