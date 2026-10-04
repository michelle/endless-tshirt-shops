import { CANVAS, renderBadge, type Design } from "./design";
import { COLLAR_PATH, PRINT_BOX, SHIRT_PATH, isDark } from "./shirt";

export function mockupSvg(d: Design, shirtHex: string, px = 1000) {
  const s = PRINT_BOX.w / CANVAS.w;
  const dark = isDark(shirtHex);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 30 1000 1000">
<rect x="0" y="0" width="1000" height="1100" fill="#F3ECDD"/>
<path d="${SHIRT_PATH}" fill="${shirtHex}" stroke="${dark ? "#000" : "#00000022"}" stroke-width="3"/>
<path d="${COLLAR_PATH}" fill="none" stroke="${dark ? "#ffffff22" : "#00000018"}" stroke-width="14"/>
<g transform="translate(${PRINT_BOX.x} ${PRINT_BOX.y}) scale(${s})">${renderBadge(d, "m")}</g>
</svg>`;
}
