import type { WaveformStyle } from "./catalog";
import { SAMPLE_COUNT } from "./design";

export interface WavePoint {
  x: number; // 0..1 across the band
  y: number; // 0 = top of band, 1 = bottom
}

/**
 * Map amplitude samples to wave geometry inside a band.
 * - "line": a single oscillating line (classic audio waveform).
 * - "fill": a mirrored, filled silhouette (mountain/echo look).
 * Both are vertically centered so the print sits nicely on a chest.
 */
export function waveGeometry(
  samples: number[],
  style: WaveformStyle,
  aspect: number // band width / band height
): WavePoint[] {
  const pts: WavePoint[] = [];
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const amp = samples[i];
    let y: number;
    if (style === "fill") {
      // silhouette mirrored around the vertical center
      const half = 0.06 + 0.44 * amp; // half-height as fraction of band
      // store center minus half as "top edge" marker; renderer mirrors it
      y = 0.5 - half;
    } else {
      y = 0.5 + (amp - 0.5) * 0.86;
    }
    pts.push({ x, y });
  }
  // Gentle aspect compensation: wide bands read better with slightly reduced swing
  if (aspect > 4) {
    const dampen = Math.min(1, 4.5 / aspect);
    return pts.map((p) => ({ x: p.x, y: 0.5 + (p.y - 0.5) * dampen }));
  }
  return pts;
}

/** Amplitude at fractional position x in [0,1], linearly interpolated. */
export function sampleAt(samples: number[], x: number): number {
  const f = Math.max(0, Math.min(1, x)) * (samples.length - 1);
  const i = Math.floor(f);
  const t = f - i;
  const a = samples[i] ?? 0;
  const b = samples[Math.min(i + 1, samples.length - 1)] ?? 0;
  return a + (b - a) * t;
}

export { SAMPLE_COUNT };
