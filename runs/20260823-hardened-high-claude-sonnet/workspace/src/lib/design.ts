import type { ShirtStyle } from "./product";

const WIDTH = 1600;
const HEIGHT = 1000;

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];
const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function pad(n: number, len = 2): string {
  return n.toString().padStart(len, "0");
}

export function formatMoment(date: Date) {
  const weekday = WEEKDAYS[date.getUTCDay()];
  const month = MONTHS[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();

  let hours = date.getUTCHours();
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  const ms = pad(date.getUTCMilliseconds(), 3);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return {
    weekday,
    dateLine: `${month} ${day}, ${year}`,
    timeLine: `${pad(hours)}:${minutes}:${seconds}.${ms} ${ampm}`,
  };
}

/** Design shown on the shirt: a self-contained SVG string. Shared by the
 * live on-site preview and the server-rendered print artwork, so what a
 * customer sees is exactly what gets printed. */
export function shirtDesignSvg(date: Date, style: ShirtStyle): string {
  const { weekday, dateLine, timeLine } = formatMoment(date);
  const accent = style === "fitted" ? "#e94f8a" : "#2dd4bf";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#101014" rx="36"/>
    <rect x="24" y="24" width="${WIDTH - 48}" height="${HEIGHT - 48}" rx="24" fill="none" stroke="${accent}" stroke-width="4"/>
    <text x="${WIDTH / 2}" y="220" font-family="Chivo" font-weight="700" font-size="56" letter-spacing="10" fill="${accent}" text-anchor="middle">THE DATETIME STORE</text>
    <text x="${WIDTH / 2}" y="330" font-family="Chivo" font-weight="500" font-size="40" letter-spacing="6" fill="#9a9aa5" text-anchor="middle">${weekday}</text>
    <text x="${WIDTH / 2}" y="470" font-family="Chivo" font-weight="900" font-size="92" fill="#f5f5f7" text-anchor="middle">${dateLine}</text>
    <text x="${WIDTH / 2}" y="640" font-family="Chivo Mono" font-weight="500" font-size="110" fill="#f5f5f7" text-anchor="middle">${timeLine}</text>
    <text x="${WIDTH / 2}" y="740" font-family="Chivo" font-weight="500" font-size="34" letter-spacing="4" fill="#9a9aa5" text-anchor="middle">THIS EXACT MOMENT, FROZEN FOREVER</text>
    <line x1="200" y1="820" x2="${WIDTH - 200}" y2="820" stroke="#2a2a30" stroke-width="2"/>
    <text x="${WIDTH / 2}" y="900" font-family="Chivo Mono" font-weight="400" font-size="30" letter-spacing="2" fill="#5f5f6a" text-anchor="middle">datetime.store</text>
  </svg>`;
}
