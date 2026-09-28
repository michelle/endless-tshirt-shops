import { Design } from "./design";
import { colorById } from "./catalog";
import { PLATE_H, PLATE_W, plateParts } from "./specimen";

// A flat-lay tee silhouette with the plate placed where the DTG front print lands.
export const MOCK_W = 1000;
export const MOCK_H = 1080;

const TEE =
  "M385 68 C430 125 570 125 615 68 L740 102 C790 116 830 150 860 190 L935 300 C940 310 936 320 926 325 L842 372 C832 377 822 373 818 364 L772 300 L780 1012 C780 1028 770 1036 755 1037 C585 1050 415 1050 245 1037 C230 1036 220 1028 220 1012 L228 300 L182 364 C178 373 168 377 158 372 L74 325 C64 320 60 310 65 300 L140 190 C170 150 210 116 260 102 Z";

export function mockupSvg(design: Design, opts: { uid?: string } = {}): string {
  const color = colorById(design.color)!;
  const { defs, content, uid } = plateParts(design, opts);
  const shade = color.dark ? "#000" : "#3a2e25";
  const hi = color.dark ? "#fff" : "#fff";
  const printW = 356;
  const printH = (printW * PLATE_H) / PLATE_W;
  const px = 500 - printW / 2;
  const py = 168;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MOCK_W} ${MOCK_H}" width="${MOCK_W}" height="${MOCK_H}">
<defs>${defs}
<linearGradient id="${uid}-teeShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade}" stop-opacity="0.16"/><stop offset="0.22" stop-color="${shade}" stop-opacity="0"/><stop offset="0.78" stop-color="${shade}" stop-opacity="0"/><stop offset="1" stop-color="${shade}" stop-opacity="0.16"/></linearGradient>
<linearGradient id="${uid}-teeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}" stop-opacity="${color.dark ? 0.07 : 0.25}"/><stop offset="1" stop-color="${shade}" stop-opacity="0.08"/></linearGradient>
<clipPath id="${uid}-teeClip"><path d="${TEE}"/></clipPath>
</defs>
<path d="${TEE}" fill="${color.hex}"/>
<g clip-path="url(#${uid}-teeClip)">
<rect width="${MOCK_W}" height="${MOCK_H}" fill="url(#${uid}-teeShade)"/>
<rect width="${MOCK_W}" height="${MOCK_H}" fill="url(#${uid}-teeV)"/>
<path d="M228 300 C275 420 262 700 240 1030" stroke="${shade}" stroke-opacity="0.07" stroke-width="18" fill="none"/>
<path d="M772 300 C725 460 742 760 762 1030" stroke="${shade}" stroke-opacity="0.07" stroke-width="18" fill="none"/>
<path d="M150 185 L228 300 M850 185 L772 300" stroke="${shade}" stroke-opacity="0.12" stroke-width="3" fill="none"/>
<svg x="${px}" y="${py}" width="${printW}" height="${printH.toFixed(1)}" viewBox="0 0 ${PLATE_W} ${PLATE_H}">${content}</svg>
</g>
<path d="M385 68 C430 125 570 125 615 68" fill="none" stroke="${shade}" stroke-opacity="0.35" stroke-width="16"/>
<path d="M385 68 C430 125 570 125 615 68" fill="none" stroke="${color.hex}" stroke-width="9"/>
<path d="M${TEE.slice(1)}" fill="none" stroke="${shade}" stroke-opacity="0.18" stroke-width="2"/>
</svg>`;
}
