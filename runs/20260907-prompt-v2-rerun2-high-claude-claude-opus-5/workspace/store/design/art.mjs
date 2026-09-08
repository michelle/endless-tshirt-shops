// "Patron Saints of Small Disasters" — devotional medallion line art.
// Single-ink, stroke-based engraving style. Generated as SVG, rasterised for DTG print.

export const INK = { light: "#161310", dark: "#F2E9D6" }; // ink colour by garment tone

const CX = 600, CY = 560;      // medallion centre
const R = 400;                 // medallion inner radius

function rays() {
  let out = "";
  for (let i = 0; i < 48; i++) {
    const a0 = (i / 48) * Math.PI * 2;
    const w = 0.010;
    const x1 = CX + Math.cos(a0 - w) * 120, y1 = CY + Math.sin(a0 - w) * 120;
    const x2 = CX + Math.cos(a0 + w) * 120, y2 = CY + Math.sin(a0 + w) * 120;
    const x3 = CX + Math.cos(a0 + w * 3.4) * R, y3 = CY + Math.sin(a0 + w * 3.4) * R;
    const x4 = CX + Math.cos(a0 - w * 3.4) * R, y4 = CY + Math.sin(a0 - w * 3.4) * R;
    out += `<path d="M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}L${x4} ${y4}Z" fill="var(--ink)" opacity=".24"/>`;
  }
  return `<g clip-path="url(#medallion)">${out}</g>`;
}

function dottedRing(r, n, dot) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out += `<circle cx="${(CX + Math.cos(a) * r).toFixed(1)}" cy="${(CY + Math.sin(a) * r).toFixed(1)}" r="${dot}" fill="var(--ink)"/>`;
  }
  return out;
}

const CROSS = (x, y, s) =>
  `<path d="M${x} ${y - s}V${y + s}M${x - s * 0.62} ${y - s * 0.28}H${x + s * 0.62}" stroke="var(--ink)" stroke-width="${s * 0.34}" stroke-linecap="round"/>`;

const STAR = (x, y, s) => {
  const p = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? s * 0.34 : s;
    p.push(`${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<path d="M${p.join("L")}Z" fill="var(--ink)"/>`;
};


// librsvg has no <textPath>, so curved lettering is set glyph by glyph.
const ADV = { " ": 0.42, I: 0.40, J: 0.56, L: 0.68, M: 1.02, W: 1.06, T: 0.72, "." : 0.34 };
function arcText(text, radius, size, { flip = false, tracking = 0.24, weight = "normal" } = {}) {
  const chars = [...text];
  const w = chars.map((c) => (ADV[c] ?? 0.78) + tracking);
  const total = w.reduce((a, b) => a + b, 0) * size;
  const sweep = total / radius;                       // radians the word occupies
  const dir = flip ? -1 : 1;
  let a = (flip ? Math.PI / 2 : -Math.PI / 2) - (dir * sweep) / 2;
  let out = "";
  chars.forEach((c, i) => {
    const step = (w[i] * size) / radius;
    const mid = a + (dir * step) / 2;
    const x = CX + Math.cos(mid) * radius;
    const y = CY + Math.sin(mid) * radius;
    const rot = (mid * 180) / Math.PI + (flip ? -90 : 90);
    if (c !== " ")
      out += `<text x="0" y="0" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)})" `
           + `font-family="Copperplate" font-weight="${weight}" font-size="${size}" `
           + `fill="var(--ink)" text-anchor="middle" dominant-baseline="central">${c}</text>`;
    a += dir * step;
  });
  return `<g>${out}</g>`;
}

// ── the saint ───────────────────────────────────────────────────────────────
function figure(relic) {
  return `
  <g clip-path="url(#medallion)" fill="none" stroke="var(--ink)" stroke-width="9"
     stroke-linecap="round" stroke-linejoin="round">
    <!-- halo -->
    <circle cx="600" cy="418" r="132" stroke-width="11"/>
    <circle cx="600" cy="418" r="150" stroke-width="4" stroke-dasharray="3 17"/>
    <!-- shoulders / robe -->
    <path d="M600 556c-96 0-176 44-206 118-34 84-50 226-56 406h524c-6-180-22-322-56-406-30-74-110-118-206-118Z" stroke-width="11"/>
    <!-- hood over the head -->
    <path d="M600 300c-78 0-128 62-128 140 0 42 12 82 34 112-42 16-74 44-90 82" stroke-width="11"/>
    <path d="M600 300c78 0 128 62 128 140 0 42-12 82-34 112 42 16 74 44 90 82" stroke-width="11"/>
    <!-- face -->
    <path d="M534 420c0-56 30-92 66-92s66 36 66 92c0 62-30 106-66 106s-66-44-66-106Z" stroke-width="8"/>
    <path d="M556 406c10-9 24-9 34 0M610 406c10-9 24-9 34 0" stroke-width="7"/>
    <path d="M600 424v34c0 8-6 12-13 12" stroke-width="6"/>
    <path d="M581 492c12 7 26 7 38 0" stroke-width="7"/>
    <!-- robe folds -->
    <path d="M470 706c-16 72-26 178-28 314M730 706c16 72 26 178 28 314" stroke-width="6"/>
    <path d="M534 880c-6 52-9 106-9 160M666 880c6 52 9 106 9 160" stroke-width="5"/>
    <!-- collar -->
    <path d="M520 592c26 44 50 68 80 68s54-24 80-68" stroke-width="8"/>
    <!-- sleeves reaching to the relic -->
    <path d="M420 700c-10 60 22 106 74 118M780 700c10 60-22 106-74 118" stroke-width="9"/>
  </g>
  <g clip-path="url(#medallion)">${relic}</g>
  <g clip-path="url(#medallion)" fill="none" stroke="var(--ink)" stroke-width="8"
     stroke-linecap="round" stroke-linejoin="round">
    <path d="M470 812c-20 6-28 24-22 42 6 18 26 26 46 20l34-10"/>
    <path d="M478 852l30-8M482 872l28-8"/>
    <path d="M730 812c20 6 28 24 22 42-6 18-26 26-46 20l-34-10"/>
    <path d="M722 852l-30-8M718 872l-28-8"/>
  </g>`;
}

// ── relics ──────────────────────────────────────────────────────────────────
// Each relic is drawn in a 240×240 box centred on (600, 770).
const S = (inner) =>
  `<g transform="translate(600 770)" fill="none" stroke="var(--ink)" stroke-width="9"
      stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

export const RELICS = {
  inbox: S(`
    <rect x="-112" y="-70" width="224" height="156" rx="10" stroke-width="12"/>
    <path d="M-112-60 0 28l112-88"/>
    <path d="M-112 78-34 4M112 78 34 4" stroke-width="7"/>
    <mask id="badgeCount" maskUnits="userSpaceOnUse" x="30" y="-176" width="200" height="200">
      <circle cx="126" cy="-88" r="64" fill="#fff" stroke="none"/>
      <text x="126" y="-68" font-family="Copperplate" font-size="62" font-weight="bold"
        fill="#000" stroke="none" text-anchor="middle">99</text>
    </mask>
    <circle cx="126" cy="-88" r="64" fill="var(--ink)" stroke="none" mask="url(#badgeCount)"/>
    <circle cx="126" cy="-88" r="79" stroke-width="9"/>`),

  battery: S(`
    <rect x="-72" y="-104" width="144" height="212" rx="20" stroke-width="12"/>
    <path d="M-30-104v-24h60v24" stroke-width="10"/>
    <rect x="-46" y="56" width="92" height="34" rx="7" fill="var(--ink)" stroke="none"/>
    <text x="0" y="16" font-family="Copperplate" font-size="64" font-weight="bold"
      fill="var(--ink)" stroke="none" text-anchor="middle">2%</text>`),

  toast: S(`
    <g transform="translate(0 26) rotate(14) scale(0.76)">
      <path d="M-108 104V-10c0-50 48-90 108-90s108 40 108 90v114c0 7-5 12-12 12H-96c-7 0-12-5-12-12Z" stroke-width="14"/>
      <g transform="translate(2 40) rotate(-6)">
        <rect x="-56" y="-36" width="112" height="72" rx="8" stroke-width="12"/>
        <path d="M-30-12h36M-18 14h32" stroke-width="8" opacity=".85"/>
      </g>
    </g>
    <g stroke-width="8" opacity=".7" transform="rotate(14)">
      <path d="M-136-58v50M-166-84v46M-166-14v30"/>
    </g>`),

  sock: S(`
    <path d="M-62-124H18v152c0 9 7 16 16 16h64c34 0 62 28 62 62s-28 62-62 62H-6c-31 0-56-25-56-56Z" stroke-width="12"/>
    <path d="M-62-84H18M-62-52H18" stroke-width="7"/>
    <path d="M-58 68c22 20 52 26 80 18" stroke-width="6" opacity=".75"/>
    <path d="M104 116c18 0 18-24 0-24" stroke-width="6" opacity=".7"/>
    <path d="M-140-92c-24 0-24 34 0 34s24 34 0 34" stroke-width="7" opacity=".55"/>`),

  replyall: S(`
    <rect x="-116" y="8" width="232" height="140" rx="10" stroke-width="12"/>
    <path d="M-116 18 0 96l116-78"/>
    <g transform="translate(30 -74) rotate(-26) scale(1.12)">
      <path d="M-96-34h34v68h-34c-10 0-18-8-18-18v-32c0-10 8-18 18-18Z" stroke-width="10"/>
      <path d="M-62-38 56-98c10-5 22 2 22 14v128c0 12-12 19-22 14L-62 38Z" stroke-width="12"/>
      <path d="M-40 34v30c0 10 8 18 18 18s18-8 18-18V52" stroke-width="9"/>
      <g stroke-width="8" opacity=".9">
        <path d="M104-42a58 58 0 0 1 0 84"/>
        <path d="M136-72a104 104 0 0 1 0 144"/>
      </g>
    </g>`),

  wheel: S(`
    <circle cx="0" cy="0" r="106" stroke-width="12"/>
    <circle cx="0" cy="0" r="34" stroke-width="9"/>
    ${Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const x1 = Math.cos(a) * 46, y1 = Math.sin(a) * 46;
      const x2 = Math.cos(a) * 94, y2 = Math.sin(a) * 94;
      return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke-width="${15 - i}" opacity="${(1 - i * 0.09).toFixed(2)}"/>`;
    }).join("")}
    <path d="M-152-98a192 192 0 0 0 0 196" stroke-width="6" stroke-dasharray="4 22"/>
    <path d="M152-98a192 192 0 0 1 0 196" stroke-width="6" stroke-dasharray="4 22"/>`),

  padlock: S(`
    <path d="M-60-24v-48c0-33 27-60 60-60s60 27 60 60v48" stroke-width="12"/>
    <rect x="-104" y="-24" width="208" height="156" rx="20" stroke-width="12"/>
    ${[-63, -21, 21, 63].map((x) => STAR(x, 54, 20)).join("")}
    <path d="M-104 148l-30 30M104 148l30 30" stroke-width="7" opacity=".6"/>`),

  smell: S(`<g transform="translate(0 62) scale(0.76)">
    <rect x="-88" y="-108" width="176" height="230" rx="16" stroke-width="12"/>
    <path d="M-88-38h176" stroke-width="9"/>
    <path d="M50-88v34M50-22v46" stroke-width="11"/>
    <g stroke-width="8">
      <path d="M-120-134c-18-14-14-40 4-46s22-30 8-44" opacity=".9"/>
      <path d="M120-134c18-14 14-40-4-46s-22-30-8-44" opacity=".9"/>
      <path d="M0-146c0-22 28-22 28-44s-28-22-28-44" opacity=".75"/>
    </g></g>`),
};

// ── full plate ──────────────────────────────────────────────────────────────
export function plate(saint, { ink = INK.dark, bg = "#101010", transparent = true } = {}) {
  const relic = RELICS[saint.relic];
  const name = saint.plateName.toUpperCase();
  const epithet = saint.epithet.toUpperCase();
  const nameSize = Math.min(104, Math.round(980 / (name.length * 0.80)));
  const epSize = Math.min(46, Math.round(940 / (epithet.length * 0.72)));
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 1560" width="1200" height="1560">
  <defs>
    <clipPath id="medallion"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
  </defs>
  ${transparent ? "" : `<rect width="1200" height="1560" fill="${bg}"/>`}

  ${rays()}
  ${figure(relic)}

  <g fill="none" stroke="var(--ink)">
    <circle cx="${CX}" cy="${CY}" r="${R}" stroke-width="13"/>
    <circle cx="${CX}" cy="${CY}" r="${R - 18}" stroke-width="4"/>
    <circle cx="${CX}" cy="${CY}" r="${R + 84}" stroke-width="6"/>
  </g>
  ${dottedRing(R + 106, 96, 4.5)}

  ${arcText("PATRON SAINT", R + 42, 46, { weight: "bold" })}
  ${arcText("OF SMALL DISASTERS", R + 42, 34, { flip: true, tracking: 0.3 })}

  ${STAR(CX - (R + 84), CY, 18)}${STAR(CX + (R + 84), CY, 18)}

  <g stroke="var(--ink)" stroke-linecap="round">
    <path d="M150 1104h900" stroke-width="6"/>
    <path d="M150 1120h900" stroke-width="2"/>
    <path d="M150 1330h900" stroke-width="2"/>
    <path d="M150 1346h900" stroke-width="6"/>
  </g>
  <text x="600" y="1206" fill="var(--ink)" font-family="Copperplate" font-weight="bold"
    font-size="${nameSize}" letter-spacing="4" text-anchor="middle">${name}</text>
  <text x="600" y="1286" fill="var(--ink)" font-family="Copperplate"
    font-size="${epSize}" letter-spacing="7" text-anchor="middle">${epithet}</text>

  <g fill="var(--ink)" font-family="Baskerville" font-style="italic" font-size="42" text-anchor="middle">
    ${saint.invocation.map((l, i) => `<text x="600" y="${1418 + i * 56}">${l}</text>`).join("")}
  </g>

  ${CROSS(600, 1540, 17)}
  ${STAR(516, 1534, 10)}${STAR(684, 1534, 10)}
</svg>`.replaceAll("var(--ink)", ink).replaceAll("var(--bg)", bg);
}
