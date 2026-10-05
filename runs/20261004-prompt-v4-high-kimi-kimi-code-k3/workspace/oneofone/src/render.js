'use strict';

// Rasterizes design SVGs to print-resolution PNGs with headless Chromium.
// Using the same engine that renders the customer's live preview guarantees
// that what they see on screen is exactly what gets printed.
const { chromium } = require('playwright');
const { CANVAS_W, CANVAS_H } = require('./art');

let browserPromise = null;
const SCALE = 3; // 1560x1930 * 3 = 4680x5790 = 300dpi over the print area

function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ args: ['--force-color-profile=srgb'] });
    browserPromise.catch(() => { browserPromise = null; });
  }
  return browserPromise;
}

async function renderPng(svg) {
  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width: CANVAS_W, height: CANVAS_H },
    deviceScaleFactor: SCALE,
  });
  try {
    await page.setContent(
      `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;background:transparent;}svg{display:block;}</style></head><body>${svg}</body></html>`,
      { waitUntil: 'load' }
    );
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ omitBackground: true, type: 'png' });
    return png;
  } finally {
    await page.close();
  }
}

async function closeRenderer() {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b) await b.close();
    browserPromise = null;
  }
}

module.exports = { renderPng, closeRenderer, SCALE };
