// Pure SVG generation for Night Shift Cryptids badge artwork.
// Plain ESM (no TypeScript, no JSX) so it can be imported both by the
// Node raster script (scripts/generate-art.mjs) and by the Next.js app.
//
// Every design renders as a 1000x1000 circular patch: brand arc up top,
// a geometric cryptid illustration, the creature name, job title, a small
// line-icon, and a tiny monogram. Transparent background outside the
// patch disc so the shirt color shows through.

function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function dotRing(cx, cy, r, count, color, opacity) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const deg = (360 / count) * i;
    const [x, y] = polar(cx, cy, r, deg);
    out += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="${color}" opacity="${opacity}"/>`;
  }
  return out;
}

function star(cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const [x, y] = polar(cx, cy, rad, i * 36);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${color}"/>`;
}

// ---- small line icons, each drawn around (cx,cy) at roughly `s` px wide ----
const ICONS = {
  coffee: (cx, cy, s, color) => `
    <g stroke="${color}" fill="none" stroke-width="${s * 0.09}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M ${cx - s * 0.4} ${cy - s * 0.1} h ${s * 0.68} v ${s * 0.42} a ${s * 0.34} ${s * 0.34} 0 0 1 -${s * 0.68} 0 Z" fill="${color}" fill-opacity="0.15"/>
      <path d="M ${cx + s * 0.28} ${cy} c ${s * 0.35} -${s * 0.02} ${s * 0.35} ${s * 0.4} 0 ${s * 0.38}"/>
      <path d="M ${cx - s * 0.28} ${cy - s * 0.22} q ${s * 0.06} -${s * 0.14} 0 -${s * 0.24}" stroke-width="${s * 0.07}"/>
      <path d="M ${cx - s * 0.02} ${cy - s * 0.22} q ${s * 0.06} -${s * 0.14} 0 -${s * 0.24}" stroke-width="${s * 0.07}"/>
    </g>`,
  flashlight: (cx, cy, s, color) => `
    <g fill="${color}">
      <polygon points="${cx - s * 0.06},${cy - s * 0.3} ${cx - s * 0.55},${cy + s * 0.32} ${cx + s * 0.55},${cy + s * 0.32} ${cx + s * 0.06},${cy - s * 0.3}" opacity="0.28"/>
      <rect x="${cx - s * 0.14}" y="${cy - s * 0.42}" width="${s * 0.28}" height="${s * 0.18}" rx="${s * 0.03}"/>
      <rect x="${cx - s * 0.1}" y="${cy - s * 0.3}" width="${s * 0.2}" height="${s * 0.1}"/>
    </g>`,
  wifi: (cx, cy, s, color) => `
    <g fill="none" stroke="${color}" stroke-width="${s * 0.1}" stroke-linecap="round">
      <path d="M ${cx - s * 0.5} ${cy - s * 0.08} A ${s * 0.62} ${s * 0.62} 0 0 1 ${cx + s * 0.5} ${cy - s * 0.08}"/>
      <path d="M ${cx - s * 0.32} ${cy + s * 0.14} A ${s * 0.38} ${s * 0.38} 0 0 1 ${cx + s * 0.32} ${cy + s * 0.14}"/>
      <path d="M ${cx - s * 0.14} ${cy + s * 0.34} A ${s * 0.16} ${s * 0.16} 0 0 1 ${cx + s * 0.14} ${cy + s * 0.34}"/>
      <circle cx="${cx}" cy="${cy + s * 0.44}" r="${s * 0.045}" fill="${color}" stroke="none"/>
    </g>`,
  headphones: (cx, cy, s, color) => `
    <g fill="none" stroke="${color}" stroke-width="${s * 0.11}" stroke-linecap="round">
      <path d="M ${cx - s * 0.4} ${cy + s * 0.1} v -${s * 0.06} a ${s * 0.4} ${s * 0.4} 0 0 1 ${s * 0.8} 0 v ${s * 0.06}"/>
      <rect x="${cx - s * 0.48}" y="${cy + s * 0.06}" width="${s * 0.18}" height="${s * 0.3}" rx="${s * 0.07}" fill="${color}" stroke="none"/>
      <rect x="${cx + s * 0.3}" y="${cy + s * 0.06}" width="${s * 0.18}" height="${s * 0.3}" rx="${s * 0.07}" fill="${color}" stroke="none"/>
    </g>`,
  box: (cx, cy, s, color) => `
    <g fill="none" stroke="${color}" stroke-width="${s * 0.09}" stroke-linejoin="round">
      <rect x="${cx - s * 0.42}" y="${cy - s * 0.3}" width="${s * 0.84}" height="${s * 0.62}" fill="${color}" fill-opacity="0.15"/>
      <path d="M ${cx - s * 0.42} ${cy - s * 0.02} h ${s * 0.84}"/>
      <path d="M ${cx - s * 0.16} ${cy - s * 0.3} v ${s * 0.62}" stroke-width="${s * 0.06}"/>
    </g>`,
  pulse: (cx, cy, s, color) => `
    <path d="M ${cx - s * 0.55} ${cy} h ${s * 0.22} l ${s * 0.1} -${s * 0.22} l ${s * 0.16} ${s * 0.44} l ${s * 0.12} -${s * 0.22} h ${s * 0.5}"
      fill="none" stroke="${color}" stroke-width="${s * 0.1}" stroke-linecap="round" stroke-linejoin="round"/>`,
};

// ---- creature illustrations, each centered around (500, y) ----
const CREATURES = {
  bigfoot: (accent, glow) => `
    <g>
      <ellipse cx="440" cy="770" rx="72" ry="26" fill="${accent}"/>
      <ellipse cx="560" cy="770" rx="72" ry="26" fill="${accent}"/>
      <path d="M 388 760 C 366 640 372 540 402 470 C 424 418 576 418 598 470 C 628 540 634 640 612 760
               C 560 786 440 786 388 760 Z" fill="${accent}"/>
      <ellipse cx="330" cy="560" rx="46" ry="90" transform="rotate(-18 330 560)" fill="${accent}"/>
      <ellipse cx="670" cy="560" rx="46" ry="90" transform="rotate(18 670 560)" fill="${accent}"/>
      <circle cx="500" cy="430" r="66" fill="${accent}"/>
      <circle cx="478" cy="424" r="9" fill="${glow}"/>
      <circle cx="522" cy="424" r="9" fill="${glow}"/>
      <path d="M 470 456 q 30 20 60 0" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>`,
  mothman: (accent, glow) => `
    <g>
      <polygon points="500,470 268,340 306,600 452,560" fill="${accent}" opacity="0.92"/>
      <polygon points="500,470 732,340 694,600 548,560" fill="${accent}" opacity="0.92"/>
      <path d="M 340 400 L 452 520" stroke="${glow}" stroke-width="3" opacity="0.5"/>
      <path d="M 660 400 L 548 520" stroke="${glow}" stroke-width="3" opacity="0.5"/>
      <path d="M 466 760 L 466 540 Q 466 460 500 434 Q 534 460 534 540 L 534 760 Z" fill="${accent}"/>
      <circle cx="500" cy="424" r="42" fill="${accent}"/>
      <circle cx="484" cy="418" r="12" fill="${glow}"/>
      <circle cx="516" cy="418" r="12" fill="${glow}"/>
    </g>`,
  nessie: (accent, glow) => `
    <g>
      <ellipse cx="420" cy="700" rx="60" ry="42" fill="${accent}"/>
      <ellipse cx="500" cy="676" rx="66" ry="48" fill="${accent}"/>
      <ellipse cx="586" cy="702" rx="56" ry="40" fill="${accent}"/>
      <path d="M 388 700 C 366 610 372 520 420 470 Q 440 450 462 458"
            stroke="${accent}" stroke-width="46" fill="none" stroke-linecap="round"/>
      <circle cx="466" cy="452" r="34" fill="${accent}"/>
      <circle cx="454" cy="446" r="7" fill="${glow}"/>
      <path d="M 330 750 Q 400 726 470 750 T 610 750 T 700 742" stroke="${glow}" stroke-width="8"
            fill="none" opacity="0.55" stroke-linecap="round"/>
    </g>`,
  chupacabra: (accent, glow) => `
    <g>
      <ellipse cx="470" cy="660" rx="150" ry="66" fill="${accent}"/>
      <path d="M 600 700 Q 690 720 720 760" stroke="${accent}" stroke-width="20" fill="none" stroke-linecap="round"/>
      <polygon points="360,610 392,556 420,610" fill="${accent}"/>
      <polygon points="420,600 448,548 474,600" fill="${accent}"/>
      <polygon points="478,596 504,546 528,598" fill="${accent}"/>
      <circle cx="640" cy="588" r="56" fill="${accent}"/>
      <polygon points="600,548 592,500 626,536" fill="${accent}"/>
      <polygon points="672,536 706,504 692,552" fill="${accent}"/>
      <circle cx="656" cy="584" r="9" fill="${glow}"/>
      <ellipse cx="368" cy="720" rx="16" ry="34" fill="${accent}"/>
      <ellipse cx="430" cy="726" rx="16" ry="34" fill="${accent}"/>
      <ellipse cx="520" cy="726" rx="16" ry="34" fill="${accent}"/>
      <ellipse cx="580" cy="720" rx="16" ry="34" fill="${accent}"/>
    </g>`,
  yeti: (accent, glow) => `
    <g>
      <ellipse cx="440" cy="775" rx="78" ry="24" fill="${accent}"/>
      <ellipse cx="560" cy="775" rx="78" ry="24" fill="${accent}"/>
      <path d="M 380 766 C 350 650 358 540 402 472 C 432 424 568 424 598 472 C 642 540 650 650 620 766
               C 555 794 445 794 380 766 Z" fill="${accent}"/>
      <ellipse cx="316" cy="580" rx="50" ry="94" transform="rotate(-14 316 580)" fill="${accent}"/>
      <ellipse cx="684" cy="580" rx="50" ry="94" transform="rotate(14 684 580)" fill="${accent}"/>
      <circle cx="500" cy="436" r="74" fill="${accent}"/>
      <circle cx="440" cy="392" r="20" fill="${accent}"/>
      <circle cx="560" cy="392" r="20" fill="${accent}"/>
      <circle cx="476" cy="430" r="10" fill="${glow}"/>
      <circle cx="524" cy="430" r="10" fill="${glow}"/>
      <g stroke="${glow}" stroke-width="4" opacity="0.7">
        <path d="M 640 330 l 0 26 M 628 343 l 24 0 M 631 334 l 18 18 M 649 334 l -18 18"/>
      </g>
    </g>`,
  jackalope: (accent, glow) => `
    <g>
      <path d="M 462 418 C 440 340 450 270 470 270 C 486 270 486 350 476 420 Z" fill="${accent}"/>
      <path d="M 538 418 C 560 340 550 270 530 270 C 514 270 514 350 524 420 Z" fill="${accent}"/>
      <g stroke="${glow}" stroke-width="8" fill="none" stroke-linecap="round">
        <path d="M 440 366 L 396 336 M 440 366 L 402 302"/>
        <path d="M 560 366 L 604 336 M 560 366 L 598 302"/>
      </g>
      <circle cx="500" cy="470" r="70" fill="${accent}"/>
      <ellipse cx="500" cy="640" rx="98" ry="78" fill="${accent}"/>
      <circle cx="616" cy="656" r="26" fill="${accent}"/>
      <ellipse cx="440" cy="700" rx="20" ry="42" fill="${accent}"/>
      <ellipse cx="560" cy="700" rx="20" ry="42" fill="${accent}"/>
      <circle cx="478" cy="462" r="9" fill="${glow}"/>
      <circle cx="516" cy="466" r="7" fill="${accent}"/>
    </g>`,
};

const CREATURE_KEYS = {
  Bigfoot: "bigfoot",
  Mothman: "mothman",
  Nessie: "nessie",
  Chupacabra: "chupacabra",
  Yeti: "yeti",
  Jackalope: "jackalope",
};

export function buildBadgeSvg(design) {
  const { name, jobTitle, ink, accent, glow } = design;
  const creatureKey = CREATURE_KEYS[name] ?? "bigfoot";
  const creature = CREATURES[creatureKey](accent, glow);
  const icon = ICONS[design.icon] ? ICONS[design.icon](500, 918, 60, glow) : "";
  const nameSize = name.length > 8 ? 58 : 70;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <path id="topArc" d="${arcPath(500, 500, 392, 205, 515)}" fill="none"/>
    <radialGradient id="discGrad" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="${ink}"/>
      <stop offset="100%" stop-color="${ink}" stop-opacity="0.94"/>
    </radialGradient>
  </defs>

  <circle cx="500" cy="500" r="480" fill="url(#discGrad)"/>
  <circle cx="500" cy="500" r="480" fill="none" stroke="${accent}" stroke-width="16"/>
  <circle cx="500" cy="500" r="440" fill="none" stroke="${accent}" stroke-width="3" opacity="0.55"/>
  ${dotRing(500, 500, 462, 44, accent, 0.5)}

  <text font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="34" letter-spacing="6" fill="${accent}">
    <textPath href="#topArc" startOffset="50%" text-anchor="middle">NIGHT SHIFT CRYPTIDS</textPath>
  </text>

  ${star(322, 250, 16, accent)}
  ${star(678, 250, 16, accent)}

  ${creature}

  <text x="500" y="846" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900"
        font-size="${nameSize}" letter-spacing="2" fill="${glow}">${name.toUpperCase()}</text>
  <text x="500" y="884" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
        font-size="25" letter-spacing="3" fill="${accent}">${jobTitle.toUpperCase()}</text>

  ${icon}

  <text x="500" y="964" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
        font-size="16" letter-spacing="3" fill="${accent}" opacity="0.8">N.S.C.</text>
</svg>`;
}

export { CREATURE_KEYS };
