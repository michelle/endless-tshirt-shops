// Flat-lay tee mockup, drawn as vector so every colourway renders identically.
export const GARMENTS = {
  black:            { hex: "#17181a", tone: "dark",  label: "Black" },
  "navy blue":      { hex: "#1e2a44", tone: "dark",  label: "Navy" },
  charcoal:         { hex: "#3b3d40", tone: "dark",  label: "Charcoal" },
  "military green": { hex: "#4a4a33", tone: "dark",  label: "Olive" },
  "dark chocolate": { hex: "#3a2b23", tone: "dark",  label: "Chocolate" },
  "cherry red":     { hex: "#8a1f2b", tone: "dark",  label: "Cherry" },
  white:            { hex: "#f6f4ef", tone: "light", label: "White" },
  sand:             { hex: "#ded3bd", tone: "light", label: "Sand" },
};

const BODY =
  "M400 132c-14 26-40 46-72 58l-178 62c-18 6-26 26-19 43l68 168c7 17 27 25 44 18l57-23v592c0 15 12 27 27 27h546c15 0 27-12 27-27V458l57 23c17 7 37-1 44-18l68-168c7-17-1-37-19-43l-178-62c-32-12-58-32-72-58Z";

export function teeSvg(hex, tone, w = 1200, h = 1400) {
  const shade = tone === "dark" ? "#ffffff" : "#000000";
  const seam = tone === "dark" ? 0.1 : 0.09;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1400" width="${w}" height="${h}">
  <defs>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${shade}" stop-opacity="${tone === "dark" ? 0.1 : 0.07}"/>
      <stop offset=".22" stop-color="${shade}" stop-opacity="0"/>
      <stop offset=".78" stop-color="${shade}" stop-opacity="0"/>
      <stop offset="1" stop-color="${shade}" stop-opacity="${tone === "dark" ? 0.1 : 0.07}"/>
    </linearGradient>
    <clipPath id="tee"><path d="${BODY}"/></clipPath>
  </defs>
  <ellipse cx="600" cy="1148" rx="320" ry="24" fill="#000" opacity=".075"/>
  <path d="${BODY}" fill="${hex}"/>
  <g clip-path="url(#tee)">
    <rect width="1200" height="1400" fill="url(#lg)"/>
    <path d="M400 132c22 46 108 78 200 78s178-32 200-78" fill="none" stroke="${shade}"
      stroke-opacity="${tone === "dark" ? 0.16 : 0.13}" stroke-width="26"/>
    <g fill="none" stroke="${shade}" stroke-opacity="${seam}" stroke-width="7">
      <path d="M300 458c-6 130-8 300-8 500M900 458c6 130 8 300 8 500"/>
      <path d="M186 396c34 22 74 36 114 42M1014 396c-34 22-74 36-114 42"/>
      <path d="M330 1050c-4 0-8 0-8 0"/>
    </g>
    <path d="M0 1170h1200v230H0Z" fill="${shade}" opacity="${tone === "dark" ? 0.05 : 0.035}"/>
  </g>
  <path d="${BODY}" fill="none" stroke="${tone === "dark" ? "#000" : "#b9b3a6"}"
    stroke-opacity="${tone === "dark" ? 0.5 : 0.85}" stroke-width="4"/>
  <path d="M400 132c22 46 108 78 200 78s178-32 200-78" fill="none"
    stroke="${tone === "dark" ? "#000" : "#b9b3a6"}" stroke-opacity="${tone === "dark" ? 0.45 : 0.8}" stroke-width="5"/>
</svg>`;
}

// Where the print sits on the mockup (in the 1200×1400 tee space).
export const PRINT_BOX = { x: 385, y: 286, w: 430 };
export const CANVAS = { w: 1200, h: 1200, offsetY: -62 };
