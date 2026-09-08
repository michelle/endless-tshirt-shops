import "server-only";
import { contourPaths, formatDate, PALETTES, type Design } from "./design";

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character] ?? character);

export function artworkSvg(design: Design) {
  const palette = PALETTES[design.palette];
  const paths = contourPaths(design).map((path) => `<path d="${path}"/>`).join("");
  const date = formatDate(design.date);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="4680" height="5790" viewBox="0 0 520 640">
      <g fill="none" stroke="#f1efe8" stroke-width="1.5" opacity="0.88">${paths}</g>
      <ellipse cx="260" cy="270" rx="218" ry="98" transform="rotate(-18 260 270)" fill="none" stroke="${palette.primary}" stroke-width="4"/>
      <circle cx="260" cy="270" r="8" fill="#f1efe8"/>
      <circle cx="417" cy="158" r="10" fill="${palette.primary}"/>
      <path d="M96 474H424M260 69V458" stroke="#f1efe8" opacity=".45" stroke-width="1" stroke-dasharray="3 9"/>
      <path d="M381 248l7 15 15 7-15 7-7 15-7-15-15-7 15-7z" fill="${palette.accent}"/>
      <text x="32" y="532" fill="#f1efe8" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="26" letter-spacing="5">${escapeXml(design.name)}</text>
      <text x="32" y="564" fill="#f1efe8" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="2.4">${escapeXml(design.place)}  /  ${date}</text>
      <line x1="32" y1="583" x2="488" y2="583" stroke="${palette.primary}" stroke-width="3"/>
      <text x="32" y="614" fill="#f1efe8" font-family="Arial, Helvetica, sans-serif" font-size="10" letter-spacing="1.45">${escapeXml(design.note)}</text>
    </svg>`;
}
