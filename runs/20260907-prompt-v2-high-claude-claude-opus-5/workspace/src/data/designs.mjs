// LAST SHIFT — crest artwork for extinct trades.
// Each design renders to a two-ink badge: primary ink + clay accent.
// Coordinate space for all art: 1200 x 1330, badge centred at (600, 490).

export const PALETTES = {
  light: { ink: '#F1E7D3', accent: '#DD7048', name: 'light' }, // for dark garments
  dark:  { ink: '#1D2426', accent: '#B0442A', name: 'dark'  }, // for light garments
};

const CX = 600, CY = 490;

/* ---------------------------------------------------------------- helpers */
const pt = (a, r, cx = CX, cy = CY) => [
  (cx + r * Math.cos((a * Math.PI) / 180)).toFixed(2),
  (cy + r * Math.sin((a * Math.PI) / 180)).toFixed(2),
];

const arc = (id, r, a0, a1, sweep) => {
  const [x0, y0] = pt(a0, r);
  const [x1, y1] = pt(a1, r);
  return `<path id="${id}" d="M${x0},${y0} A${r},${r} 0 0 ${sweep} ${x1},${y1}" fill="none"/>`;
};

const star = (x, y, r, fill) => {
  // four-point sparkle
  const s = r * 0.24;
  return `<path d="M${x},${y - r} C${x + s},${y - s} ${x + s},${y - s} ${x + r},${y}
    C${x + s},${y + s} ${x + s},${y + s} ${x},${y + r}
    C${x - s},${y + s} ${x - s},${y + s} ${x - r},${y}
    C${x - s},${y - s} ${x - s},${y - s} ${x},${y - r} Z" fill="${fill}"/>`;
};

const waves = (y, x0, x1, amp, step, sw) => {
  let d = `M${x0},${y}`;
  for (let x = x0; x < x1; x += step) {
    d += ` q${step / 4},${-amp} ${step / 2},0 q${step / 4},${amp} ${step / 2},0`;
  }
  return `<path d="${d}" fill="none" stroke-width="${sw}"/>`;
};

/* ------------------------------------------------------------------- art  */

function knockerUpper() {
  return `
  <g stroke="var(--ink)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    ${star(360, 300, 26, 'var(--accent)')}
    ${star(430, 238, 17, 'var(--ink)')}
    ${star(322, 392, 13, 'var(--ink)')}

    <!-- window -->
    <rect x="498" y="238" width="286" height="366" rx="6" stroke-width="15"/>
    <rect x="524" y="264" width="234" height="314" rx="3" stroke-width="9"/>
    <path d="M641,264 V578 M524,392 H758 M524,470 H758" stroke-width="9"/>
    <path d="M478,604 H804 a10,10 0 0 1 10,10 v16 a10,10 0 0 1 -10,10 H478 a10,10 0 0 1 -10,-10 v-16 a10,10 0 0 1 10,-10 Z" stroke-width="13"/>

    <!-- pea-shooter pole -->
    <path d="M322,806 L688,384" stroke-width="19"/>
    <path d="M336,792 L372,824" stroke-width="11"/>
    <circle cx="698" cy="372" r="19" stroke-width="12" fill="var(--accent)"/>
    <path d="M690,352 L676,326 M712,362 L738,352" stroke-width="9"/>

    <!-- taps -->
    <path d="M660,300 a72,72 0 0 1 62,-16" stroke-width="9" stroke="var(--accent)"/>
    <path d="M636,268 a112,112 0 0 1 100,-26" stroke-width="9" stroke="var(--accent)"/>
  </g>`;
}

function lamplighter() {
  return `
  <g stroke="var(--ink)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <!-- glow -->
    <g stroke="var(--accent)" stroke-width="9" stroke-dasharray="26 30">
      <circle cx="646" cy="330" r="146"/>
      <circle cx="646" cy="330" r="196"/>
    </g>

    <!-- lantern -->
    <path d="M646,196 L716,262 H576 Z" stroke-width="14"/>
    <path d="M646,196 v-26" stroke-width="12"/>
    <circle cx="646" cy="160" r="13" stroke-width="11" fill="var(--accent)"/>
    <path d="M592,262 h108 l16,124 H576 Z" stroke-width="14"/>
    <path d="M646,262 v124 M604,262 l-8,124 M688,262 l8,124" stroke-width="8"/>
    <path d="M646,306 c22,20 20,42 0,54 c-20,-12 -22,-34 0,-54 Z" fill="var(--accent)" stroke="none"/>

    <!-- post -->
    <path d="M646,386 V806" stroke-width="17"/>
    <path d="M584,404 H708" stroke-width="12"/>
    <path d="M600,806 h92 l16,34 H584 Z" stroke-width="14"/>

    <!-- ladder -->
    <g stroke-width="14">
      <path d="M336,844 L546,406"/>
      <path d="M408,878 L618,440"/>
    </g>
    <g stroke-width="10">
      <path d="M352,812 L424,846"/>
      <path d="M382,750 L454,784"/>
      <path d="M412,688 L484,722"/>
      <path d="M442,626 L514,660"/>
      <path d="M472,564 L544,598"/>
      <path d="M502,502 L574,536"/>
    </g>
  </g>`;
}

function switchboard() {
  const jacks = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 7; c++) {
      const x = 424 + c * 59;
      const y = 300 + r * 66;
      jacks.push(
        `<circle cx="${x}" cy="${y}" r="19" stroke-width="9"/><circle cx="${x}" cy="${y}" r="7" fill="var(--ink)" stroke="none"/>`
      );
    }
  }
  const plug = (x, y, rot) => `
    <g transform="translate(${x},${y}) rotate(${rot}) scale(1.3)">
      <rect x="-17" y="-6" width="34" height="76" rx="12" stroke-width="11" fill="none"/>
      <path d="M0,-6 V-44" stroke-width="13"/>
      <circle cx="0" cy="-52" r="9" fill="var(--accent)" stroke="none"/>
      <path d="M-17,26 H17" stroke-width="8"/>
    </g>`;
  return `
  <g stroke="var(--ink)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="368" y="252" width="464" height="228" rx="14" stroke-width="15"/>
    ${jacks.join('')}
    <!-- patch cords -->
    <g stroke="var(--accent)" stroke-width="13">
      <path d="M424,300 C300,420 328,626 452,660"/>
      <path d="M778,366 C900,470 862,650 736,676"/>
      <path d="M542,432 C540,560 618,596 664,626"/>
    </g>
    ${plug(468, 668, 118)}
    ${plug(720, 684, -118)}
    <path d="M300,806 H900" stroke-width="0" stroke="none"/>
  </g>`;
}

function iceCutter() {
  const facet = (x1, y1, x2, y2) => `<path d="M${x1},${y1} L${x2},${y2}" stroke-width="8"/>`;
  return `
  <g stroke="var(--ink)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <!-- ice block, isometric -->
    <g stroke-width="15">
      <path d="M436,506 H734 V694 H436 Z"/>
      <path d="M436,506 L524,424 H822 L734,506"/>
      <path d="M734,506 L822,424 V612 L734,694"/>
    </g>
    <g stroke="var(--accent)">
      ${facet(470, 660, 560, 566)}
      ${facet(556, 668, 700, 528)}
      ${facet(636, 672, 706, 600)}
      ${facet(760, 592, 800, 550)}
    </g>

    <!-- ice tongs -->
    <g stroke="var(--accent)" stroke-width="19">
      <path d="M600,286 C512,316 448,398 434,548"/>
      <path d="M600,286 C688,316 752,398 766,548"/>
    </g>
    <g stroke="var(--accent)" stroke-width="15">
      <path d="M600,286 C640,300 668,318 690,342"/>
      <path d="M600,286 C560,300 532,318 510,342"/>
    </g>
    <circle cx="600" cy="286" r="15" fill="var(--accent)" stroke="none"/>
    <circle cx="600" cy="232" r="40" stroke="var(--accent)" stroke-width="17"/>
    <path d="M600,272 v-4" stroke="var(--accent)" stroke-width="17"/>

    <path d="M434,548 h30 M766,548 h-30" stroke="var(--accent)" stroke-width="15"/>

    <!-- open water -->
    <g stroke="var(--ink)">
      ${waves(742, 348, 852, 14, 68, 11)}
      ${waves(792, 396, 804, 12, 68, 11)}
    </g>
  </g>`;
}

function humanComputer() {
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const x = 436 + i * 16.4;
    const long = i % 5 === 0;
    return `<path d="M${x.toFixed(1)},700 v${long ? -26 : -15}"/><path d="M${x.toFixed(1)},724 v${long ? 26 : 15}"/>`;
  }).join('');
  return `
  <g stroke="var(--ink)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g transform="rotate(-19 600 420)">
      <ellipse cx="600" cy="420" rx="280" ry="118" stroke-width="12"/>
    </g>
    <circle cx="600" cy="420" r="98" stroke-width="14"/>
    <path d="M520,364 c50,26 110,26 160,0 M504,420 h192 M520,476 c50,-26 110,-26 160,0" stroke-width="8"/>
    <g transform="translate(865,329) rotate(28)">
      <path d="M-26,-17 h40 l19,17 l-19,17 h-40 Z" fill="var(--accent)" stroke="var(--accent)" stroke-width="10"/>
    </g>
    <path d="M865,329 C815,222 665,196 566,246" stroke-width="10" stroke-dasharray="21 24" stroke="var(--accent)"/>
    <g>
      <rect x="420" y="664" width="360" height="96" rx="8" stroke-width="13"/>
      <path d="M420,700 H780 M420,724 H780" stroke-width="8"/>
      <g stroke-width="6">${ticks}</g>
      <rect x="574" y="648" width="52" height="128" rx="6" stroke-width="12" stroke="var(--accent)"/>
      <path d="M600,648 V776" stroke-width="7" stroke="var(--accent)"/>
    </g>
  </g>`;
}

function logDriver() {
  return `
  <g stroke="var(--ink)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <!-- log end -->
    <circle cx="470" cy="466" r="165" stroke-width="17"/>
    <ellipse cx="461" cy="459" rx="119" ry="124" stroke-width="10"/>
    <ellipse cx="453" cy="452" rx="75" ry="81" stroke-width="10"/>
    <ellipse cx="446" cy="446" rx="33" ry="37" stroke-width="10"/>
    <path d="M470,466 L378,312 M470,466 L604,398 M470,466 L364,586" stroke-width="9"/>

    <!-- peavey -->
    <path d="M866,286 L654,498" stroke-width="23"/>
    <path d="M654,498 L606,546" stroke-width="15"/>
    <path d="M736,392 l-32,-32 M710,418 l-32,-32" stroke-width="9"/>
    <circle cx="686" cy="466" r="15" fill="var(--accent)" stroke="none"/>
    <path d="M686,466 C736,530 700,600 600,576" stroke-width="22" stroke="var(--accent)"/>

    <!-- river -->
    <g stroke="var(--accent)">
      ${waves(686, 300, 900, 15, 76, 12)}
      ${waves(742, 348, 852, 13, 76, 12)}
    </g>
  </g>`;
}

/* --------------------------------------------------------------- catalog  */

export const DESIGNS = [
  {
    slug: 'knocker-upper',
    trade: 'Knocker-Upper',
    arcTop: 'THE KNOCKER-UPPER',
    years: '1750 — 1973',
    local: 'LOCAL №Ⅰ',
    mottoLines: ['Sleep Is Not', 'An Excuse'],
    art: knockerUpper,
    blurb:
      'Before the alarm clock was cheap, somebody had to wake the town. Knocker-uppers walked the pre-dawn streets with a long bamboo pole, tapping bedroom panes for a few pence a week — and were themselves woken by someone even poorer. Britain kept them on the payroll until the 1970s.',
    fact: 'Paid roughly sixpence a week per window. Nobody has ever explained who woke the last one.',
  },
  {
    slug: 'lamplighter',
    trade: 'Lamplighter',
    arcTop: 'THE LAMPLIGHTER',
    years: '1417 — 1962',
    local: 'LOCAL №Ⅱ',
    mottoLines: ['We Held Back', 'The Night'],
    art: lamplighter,
    blurb:
      'Every dusk, a ladder against a cast-iron post and a wick brought to life — one lamp at a time, the whole city. The lamplighter carried the ladder, the flame, and a quiet responsibility for whether the streets were safe after dark. Electricity retired the trade a lamp at a time.',
    fact: 'A good London lamplighter lit around 100 lamps an hour. Some routes are still walked by hand in Wales.',
  },
  {
    slug: 'switchboard-operator',
    trade: 'Switchboard Operator',
    arcTop: 'SWITCHBOARD OPERATOR',
    years: '1878 — 1983',
    local: 'LOCAL №Ⅲ',
    mottoLines: ['One Moment,', 'Connecting You'],
    art: switchboard,
    blurb:
      'For a century, every long-distance conversation on earth passed through a pair of human hands and a brass patch cord. Operators memorised hundreds of jacks, worked in perfect posture, and heard the century go by one call at a time. Automatic exchanges cut the last cord in 1983.',
    fact: 'The first operators were teenage boys. They were replaced by women within a year for being rude to customers.',
  },
  {
    slug: 'ice-cutter',
    trade: 'Ice Cutter',
    arcTop: 'THE ICE CUTTER',
    years: '1806 — 1935',
    local: 'LOCAL №Ⅳ',
    mottoLines: ['We Sold Winter', 'In July'],
    art: iceCutter,
    blurb:
      'An entire industry stood on frozen lakes with handsaws, cut the winter into blocks, packed it in sawdust and shipped it to the tropics. New England ice reached Calcutta in good condition. Then somebody built a compressor, and a hundred thousand jobs melted.',
    fact: 'In 1886 the United States harvested 25 million tons of natural ice. By 1935 the trade was essentially gone.',
  },
  {
    slug: 'human-computer',
    trade: 'Human Computer',
    arcTop: 'THE HUMAN COMPUTER',
    years: '1758 — 1974',
    local: 'LOCAL №Ⅴ',
    mottoLines: ['The Answers Came', 'By Hand'],
    art: humanComputer,
    blurb:
      '"Computer" was a job title long before it was a machine. Rooms of them — overwhelmingly women — worked orbital mechanics and ballistics tables with slide rules and mechanical calculators. They checked the electronic machines that replaced them, and were usually right.',
    fact: 'Katherine Johnson hand-verified the IBM 7090 trajectory for Friendship 7. John Glenn would not fly until she did.',
  },
  {
    slug: 'log-driver',
    trade: 'Log Driver',
    arcTop: 'THE LOG DRIVER',
    years: '1800 — 1974',
    local: 'LOCAL №Ⅵ',
    mottoLines: ['Never Turn Your', 'Back On The River'],
    art: logDriver,
    blurb:
      'They rode the spring drive downriver on the logs themselves, peavey in hand, breaking jams that could kill a man instantly. It was the most dangerous work in North America and among the best paid. Trucks and highways ended the last big drive in the 1970s.',
    fact: 'A log jam on the Chippewa in 1869 was 15 miles long and took 200 men six weeks to break.',
  },
];

/* --------------------------------------------------------- badge assembly */

let uid = 0;

export function badgeSVG(design, palette, opts = {}) {
  const { ink, accent } = palette;
  const paper = opts.paper || 'none';
  const R_OUT = 470, R_MID = 448, R_IN = 372;
  const u = `b${++uid}`;

  // Fit the trade name to the available arc length.
  const A0 = -168, A1 = -12;
  const arcLen = (Math.abs(A1 - A0) / 360) * 2 * Math.PI * 386;
  const TRACK = 7;
  const nameSize = Math.max(46, Math.min(80, ((arcLen * 0.92) / design.arcTop.length - TRACK) / 0.66));
  const rName = R_IN + 6 + (76 - 0.7 * nameSize) / 2;

  const art = design
    .art()
    .replaceAll('var(--ink)', ink)
    .replaceAll('var(--accent)', accent)
    .replaceAll('var(--paper)', paper);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1330" width="1200" height="1330">
  <defs>
    <style>
      #${u} .arc-name { font-family: 'Copperplate','Copperplate Gothic Bold','Optima',Georgia,serif; font-weight:700; font-size:${nameSize.toFixed(1)}px; letter-spacing:${TRACK}px; }
      #${u} .arc-year { font-family: 'Copperplate','Copperplate Gothic Light','Optima',Georgia,serif; font-weight:400; font-size:56px; letter-spacing:14px; }
      #${u} .motto   { font-family: 'Didot','Bodoni 72','Playfair Display',Georgia,serif; font-style:italic; font-size:122px; }
      #${u} .local   { font-family: 'Copperplate','Optima',Georgia,serif; font-size:42px; letter-spacing:15px; }
    </style>
    ${arc(u + 'top', rName, A0, A1, 1)}
    ${arc(u + 'bot', R_MID - 14, 152, 28, 0)}
    <clipPath id="${u}clip"><circle cx="${CX}" cy="${CY}" r="356"/></clipPath>
  </defs>
  <g id="${u}" fill="${ink}">
    <circle cx="${CX}" cy="${CY}" r="${R_OUT}" fill="none" stroke="${ink}" stroke-width="9"/>
    <circle cx="${CX}" cy="${CY}" r="${R_MID}" fill="none" stroke="${ink}" stroke-width="19"/>
    <circle cx="${CX}" cy="${CY}" r="${R_IN}" fill="none" stroke="${ink}" stroke-width="7" stroke-dasharray="2 23" stroke-linecap="round"/>

    <g clip-path="url(#${u}clip)" transform="translate(${CX},${CY}) scale(1.03) translate(${-CX},${-CY})">${art}</g>

    <text class="arc-name"><textPath href="#${u}top" startOffset="50%" text-anchor="middle">${design.arcTop}</textPath></text>
    <text class="arc-year"><textPath href="#${u}bot" startOffset="50%" text-anchor="middle">${design.years}</textPath></text>

    ${star(...pt(180, 410).map(Number), 25, accent)}
    ${star(...pt(4, 410).map(Number), 25, accent)}

    <text class="motto" x="${CX}" y="1088" text-anchor="middle">${design.mottoLines[0]}</text>
    <text class="motto" x="${CX}" y="1210" text-anchor="middle">${design.mottoLines[1]}</text>

    <path d="M${CX - 250},1262 H${CX - 42} M${CX + 42},1262 H${CX + 250}" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>
    ${star(CX, 1262, 16, accent)}
    <text class="local" x="${CX}" y="1322" text-anchor="middle">${design.local}</text>
  </g>
</svg>`;
}
