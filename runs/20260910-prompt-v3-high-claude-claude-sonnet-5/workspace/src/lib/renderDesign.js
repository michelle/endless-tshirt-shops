"use client";

import { buildLayout, drawConstellation, CANVAS_ASPECT } from "./constellation";

let fontsPromise = null;
export function ensureFontsReady() {
  if (typeof document === "undefined") return Promise.resolve();
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      document.fonts.load('700 40px "Cormorant Garamond"'),
      document.fonts.load('500 20px "Space Grotesk"'),
      document.fonts.ready,
    ]).catch(() => {});
  }
  return fontsPromise;
}

export function renderDesignToCanvas(canvas, { phrase, subtitle, paletteKey, shirtIsDark }) {
  const ctx = canvas.getContext("2d");
  const layout = buildLayout({ phrase, subtitle });
  drawConstellation(ctx, {
    width: canvas.width,
    height: canvas.height,
    layout,
    paletteKey,
    shirtIsDark,
  });
  return layout;
}

// Renders a high-resolution PNG data URL suitable for print submission.
export async function renderDesignDataURL(params, { width = 2100, height } = {}) {
  await ensureFontsReady();
  const h = height || Math.round(width / CANVAS_ASPECT);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = h;
  renderDesignToCanvas(canvas, params);
  return canvas.toDataURL("image/png");
}
