/** Renderer-agnostic drawing primitives. Serialised to SVG for both the
 *  on-screen preview and the print-ready raster, so what you see is what
 *  gets pressed onto the shirt. */

export type Shape =
  | {
      kind: "path";
      d: string;
      stroke?: string;
      strokeWidth?: number;
      fill?: string;
      cap?: "butt" | "round" | "square";
      join?: "miter" | "round" | "bevel";
      opacity?: number;
      dash?: string;
    }
  | {
      kind: "circle";
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
    }
  | {
      kind: "text";
      x: number;
      y: number;
      text: string;
      size: number;
      fill: string;
      family: "display" | "mono";
      anchor?: "start" | "middle" | "end";
      letterSpacing?: number;
      weight?: number;
      opacity?: number;
    }
  | { kind: "group"; transform: string; children: Shape[]; opacity?: number };

export const FONT_DISPLAY = "Space Grotesk";
export const FONT_MONO = "JetBrains Mono";

export function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&apos;",
  );
}

function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

function attr(name: string, value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  return ` ${name}="${typeof value === "number" ? num(value) : escapeXml(String(value))}"`;
}

export function shapeToSvg(s: Shape): string {
  switch (s.kind) {
    case "path":
      return (
        `<path${attr("d", s.d)}${attr("fill", s.fill ?? "none")}${attr("stroke", s.stroke)}` +
        `${attr("stroke-width", s.strokeWidth)}${attr("stroke-linecap", s.cap)}` +
        `${attr("stroke-linejoin", s.join ?? "round")}${attr("stroke-dasharray", s.dash)}` +
        `${attr("opacity", s.opacity)}/>`
      );
    case "circle":
      return (
        `<circle${attr("cx", s.cx)}${attr("cy", s.cy)}${attr("r", s.r)}` +
        `${attr("fill", s.fill ?? "none")}${attr("stroke", s.stroke)}${attr("stroke-width", s.strokeWidth)}` +
        `${attr("opacity", s.opacity)}/>`
      );
    case "text":
      return (
        `<text${attr("x", s.x)}${attr("y", s.y)}${attr("fill", s.fill)}` +
        `${attr("font-family", s.family === "mono" ? FONT_MONO : FONT_DISPLAY)}` +
        `${attr("font-size", s.size)}${attr("font-weight", s.weight)}` +
        `${attr("text-anchor", s.anchor ?? "middle")}${attr("letter-spacing", s.letterSpacing)}` +
        `${attr("opacity", s.opacity)}>${escapeXml(s.text)}</text>`
      );
    case "group":
      return `<g${attr("transform", s.transform)}${attr("opacity", s.opacity)}>${s.children
        .map(shapeToSvg)
        .join("")}</g>`;
  }
}

export function shapesToSvg(shapes: Shape[]): string {
  return shapes.map(shapeToSvg).join("");
}

export function svgDocument(
  width: number,
  height: number,
  shapes: Shape[],
  opts: { background?: string; viewBox?: string; extraDefs?: string } = {},
): string {
  const vb = opts.viewBox ?? `0 0 ${num(width)} ${num(height)}`;
  const bg = opts.background ? `<rect x="0" y="0" width="100%" height="100%" fill="${opts.background}"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="${vb}">` +
    (opts.extraDefs ?? "") +
    bg +
    shapesToSvg(shapes) +
    `</svg>`
  );
}
