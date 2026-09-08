// Wordmark / favicon / OG image, built from the same medallion vocabulary.
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { plate, INK } from "./art.mjs";

const root = path.resolve(import.meta.dirname, "..");
const saints = JSON.parse(await fs.readFile(path.join(root, "data/saints.json"), "utf8"));

const seal = (ink) => `
  <g fill="none" stroke="${ink}" stroke-width="12">
    <circle cx="128" cy="128" r="118"/><circle cx="128" cy="128" r="100" stroke-width="4"/>
  </g>
  <path d="M128 70v116M92 106h72" stroke="${ink}" stroke-width="16" stroke-linecap="round"/>`;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="40" fill="#1b1713"/>${seal("#f2e9d6")}</svg>`;

await sharp(Buffer.from(icon)).resize(180, 180).png().toFile(path.join(root, "app/icon.png"));
await sharp(Buffer.from(icon)).resize(180, 180).png().toFile(path.join(root, "app/apple-icon.png"));

// Open Graph card: three plates on parchment.
const picks = ["st-vera-of-the-unread-inbox", "st-marguerite-of-the-spinning-wheel", "st-bartholomew-of-the-buttered-side-down"];
const arts = await Promise.all(
  picks.map(async (slug) =>
    sharp(Buffer.from(plate(saints.find((s) => s.slug === slug), { ink: INK.light })), { density: 300 })
      .resize({ width: 300 }).png().toBuffer()),
);
const words = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#f4efe3"/>
  <text x="600" y="92" font-family="Copperplate" font-weight="bold" font-size="46" letter-spacing="7"
    fill="#1b1713" text-anchor="middle">THE ORDER OF SMALL DISASTERS</text>
  <text x="600" y="140" font-family="Baskerville" font-style="italic" font-size="30"
    fill="#4a423a" text-anchor="middle">Patron saints for the catastrophes that never make the news</text>
  <path d="M120 172h960" stroke="#cbbfa8" stroke-width="2"/>
  <text x="600" y="596" font-family="Copperplate" font-size="26" letter-spacing="6"
    fill="#4a423a" text-anchor="middle">EIGHT PLATES · PRINTED TO ORDER</text>
</svg>`;
await sharp(Buffer.from(words))
  .composite(arts.map((input, i) => ({ input, left: 110 + i * 340, top: 202 })))
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(path.join(root, "public/og.jpg"));

console.log("✓ brand assets");
