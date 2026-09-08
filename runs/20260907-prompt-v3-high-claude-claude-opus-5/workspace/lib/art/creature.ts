/** Modular creature illustration.
 *
 *  Everything is drawn into a 1000x1000 box. The silhouette is assembled from
 *  a list of shapes which are then rendered twice: once fattened in ink to
 *  create a single unified outline, once in flat colour on top. That removes
 *  every internal seam between overlapping parts, which is what makes a
 *  parts-based generator look hand-drawn rather than assembled.
 */

import { Genome } from "../genome";
import { Rng } from "../rng";
import {
  Pt,
  pt,
  add,
  mul,
  norm,
  sub,
  blob,
  circle,
  polyPath,
  smoothPath,
  taperedLimb,
  teeth,
  pathsBBox,
  fmt,
} from "./geom";

export type CreatureColors = { ink: string; paper: string };

/** A silhouette piece: path plus which flat colour fills it. */
type Piece = { d: string; tone: "hide" | "shade" | "accent" };

type Anatomy = {
  pieces: Piece[];
  /** Ink linework drawn on top of the flat colour. */
  lines: string[];
  head: { c: Pt; rx: number; ry: number };
  bodyBox: { x: number; y: number; w: number; h: number };
  hornAnchor: Pt;
  tailAnchor: { p: Pt; angle: number };
  wingAnchor: { p: Pt };
  /** Lowest painted y, used to sit the creature on the ground rule. */
  baseline: number;
};

const GROUND = 928;

/* ------------------------------------------------------------------ */
/* Archetypes                                                          */
/* ------------------------------------------------------------------ */

function lanky(g: Genome, rng: Rng): Anatomy {
  const lean = g.lean * 260;
  const bodyC = pt(500 + lean * 0.4, 545);
  const body = blob(bodyC.x, bodyC.y, 118, 205, g.wobble);
  const headC = pt(500 + lean, 236);
  const head = blob(headC.x, headC.y, 92, 100, g.wobble.slice(2).concat(g.wobble.slice(0, 2)));
  const neck = taperedLimb(
    [pt(bodyC.x, 400), pt((bodyC.x + headC.x) / 2, 340), pt(headC.x, 300)],
    62,
    72
  );

  const pieces: Piece[] = [
    { d: neck, tone: "hide" },
    { d: body, tone: "hide" },
    { d: head, tone: "hide" },
  ];
  const lines: string[] = [];

  // arms
  for (const s of [-1, 1] as const) {
    const sh = pt(bodyC.x + s * 96, 425);
    const spine = [
      sh,
      pt(sh.x + s * 78 + g.limbWobble[0] * 30, 545),
      pt(sh.x + s * 96, 690),
      pt(sh.x + s * (58 + g.limbWobble[1] * 40), 790),
    ];
    pieces.push({ d: taperedLimb(spine, 46, 17), tone: "hide" });
    pieces.push({ d: clawHand(spine[3], s, 30, rng), tone: "hide" });
  }
  // legs
  for (const s of [-1, 1] as const) {
    const hip = pt(bodyC.x + s * 62, 705);
    const spine = [
      hip,
      pt(hip.x + s * 34, 800),
      pt(hip.x + s * 16, GROUND - 26),
    ];
    pieces.push({ d: taperedLimb(spine, 62, 26), tone: "hide" });
    pieces.push({ d: foot(pt(hip.x + s * 16, GROUND - 18), s, 46), tone: "hide" });
    lines.push(
      smoothPath([pt(hip.x + s * 30, 792), pt(hip.x + s * 44, 800)], false)
    );
  }

  return {
    pieces,
    lines,
    head: { c: headC, rx: 92, ry: 100 },
    bodyBox: { x: bodyC.x - 118, y: bodyC.y - 205, w: 236, h: 410 },
    hornAnchor: pt(headC.x, headC.y - 86),
    tailAnchor: { p: pt(bodyC.x, 700), angle: Math.PI * 0.62 },
    wingAnchor: { p: pt(bodyC.x, 430) },
    baseline: GROUND,
  };
}

function hulk(g: Genome, rng: Rng): Anatomy {
  const lean = g.lean * 120;
  const bodyC = pt(500 + lean, 585);
  const body = blob(bodyC.x, bodyC.y, 232, 205, g.wobble);
  const headC = pt(500 + lean * 1.6, 336);
  const head = blob(headC.x, headC.y, 138, 118, g.wobble.slice(4).concat(g.wobble.slice(0, 4)));
  const neck = taperedLimb([pt(bodyC.x, 470), pt(headC.x, 380)], 150, 150);

  const pieces: Piece[] = [
    { d: neck, tone: "hide" },
    { d: body, tone: "hide" },
    { d: head, tone: "hide" },
  ];
  const lines: string[] = [];

  for (const s of [-1, 1] as const) {
    const sh = pt(bodyC.x + s * 190, 490);
    const spine = [
      sh,
      pt(sh.x + s * 62, 610),
      pt(sh.x + s * 52, 760),
      pt(sh.x + s * 22, 838),
    ];
    pieces.push({ d: taperedLimb(spine, 104, 52), tone: "hide" });
    pieces.push({ d: clawHand(spine[3], s, 46, rng), tone: "hide" });
  }
  for (const s of [-1, 1] as const) {
    const hip = pt(bodyC.x + s * 108, 730);
    const spine = [hip, pt(hip.x + s * 14, 830), pt(hip.x + s * 6, GROUND - 26)];
    pieces.push({ d: taperedLimb(spine, 130, 92), tone: "hide" });
    pieces.push({ d: foot(pt(hip.x + s * 6, GROUND - 16), s, 74), tone: "hide" });
  }
  lines.push(smoothPath([pt(bodyC.x, 745), pt(bodyC.x + 6, GROUND - 40)], false));

  return {
    pieces,
    lines,
    head: { c: headC, rx: 138, ry: 118 },
    bodyBox: { x: bodyC.x - 232, y: bodyC.y - 205, w: 464, h: 410 },
    hornAnchor: pt(headC.x, headC.y - 104),
    tailAnchor: { p: pt(bodyC.x, 690), angle: Math.PI * 0.55 },
    wingAnchor: { p: pt(bodyC.x, 450) },
    baseline: GROUND,
  };
}

function crawler(g: Genome, rng: Rng): Anatomy {
  const bodyC = pt(500, 690);
  const body = blob(bodyC.x, bodyC.y, 205, 132, g.wobble);
  const headC = pt(500 + g.lean * 200, 520);
  const head = blob(headC.x, headC.y, 118, 104, g.wobble.slice(3).concat(g.wobble.slice(0, 3)));
  const neck = taperedLimb([pt(bodyC.x, 640), pt(headC.x, 560)], 130, 118);

  const pieces: Piece[] = [
    { d: neck, tone: "hide" },
    { d: body, tone: "hide" },
    { d: head, tone: "hide" },
  ];
  const lines: string[] = [];

  const legCount = 3;
  for (const s of [-1, 1] as const) {
    for (let i = 0; i < legCount; i++) {
      const t = i / (legCount - 1);
      const root = pt(bodyC.x + s * (60 + t * 120), 668 + t * 26);
      const peak = pt(
        root.x + s * (110 + g.limbWobble[i] * 40),
        566 + t * 70 + g.limbWobble[i + 3] * 40
      );
      const toe = pt(peak.x + s * (74 + t * 40), GROUND - 8);
      pieces.push({ d: taperedLimb([root, peak, toe], 34, 9), tone: "hide" });
    }
  }

  return {
    pieces,
    lines,
    head: { c: headC, rx: 118, ry: 104 },
    bodyBox: { x: bodyC.x - 205, y: bodyC.y - 132, w: 410, h: 264 },
    hornAnchor: pt(headC.x, headC.y - 90),
    tailAnchor: { p: pt(bodyC.x - 170, 700), angle: Math.PI * 0.9 },
    wingAnchor: { p: pt(bodyC.x, 600) },
    baseline: GROUND,
  };
}

function wisp(g: Genome, rng: Rng): Anatomy {
  const c = pt(500 + g.lean * 120, 470);
  // teardrop: wide dome up top, drawn to a soft point below
  const pts: Pt[] = [];
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const wob = 1 + g.wobble[i % g.wobble.length];
    // squeeze the bottom half inwards
    const squeeze = a > 0 && a < Math.PI ? 0.42 + 0.58 * Math.abs(Math.cos(a)) : 1;
    pts.push(
      pt(c.x + Math.cos(a) * 158 * wob * squeeze, c.y + Math.sin(a) * 238 * wob)
    );
  }
  const body = smoothPath(pts, true);

  const pieces: Piece[] = [{ d: body, tone: "hide" }];
  const lines: string[] = [];

  // trailing tendrils
  const strands: number = 5;
  for (let i = 0; i < strands; i++) {
    const t = strands === 1 ? 0.5 : i / (strands - 1);
    const x = c.x + (t - 0.5) * 190;
    const spine: Pt[] = [pt(x, 660)];
    let cx = x;
    for (let k = 1; k <= 5; k++) {
      cx += Math.sin(k * 1.5 + i * 2.1 + g.limbWobble[i] * 4) * 26;
      spine.push(pt(cx, 660 + k * ((GROUND - 690) / 5)));
    }
    pieces.push({ d: taperedLimb(spine, 34 - i * 2, 5), tone: "hide" });
  }
  // two thin arms
  for (const s of [-1, 1] as const) {
    const sh = pt(c.x + s * 120, 470);
    const spine = [sh, pt(sh.x + s * 92, 560), pt(sh.x + s * 74, 664)];
    pieces.push({ d: taperedLimb(spine, 30, 10), tone: "hide" });
    pieces.push({ d: clawHand(spine[2], s, 24, rng), tone: "hide" });
  }

  return {
    pieces,
    lines,
    head: { c: pt(c.x, c.y - 62), rx: 150, ry: 140 },
    bodyBox: { x: c.x - 158, y: c.y - 238, w: 316, h: 420 },
    hornAnchor: pt(c.x, c.y - 224),
    tailAnchor: { p: pt(c.x, 640), angle: Math.PI * 0.5 },
    wingAnchor: { p: pt(c.x, 430) },
    baseline: GROUND,
  };
}

function coiled(g: Genome, rng: Rng): Anatomy {
  // A spiral spine, tail tip on the ground, head raised at the top.
  const cx = 500;
  const spine: Pt[] = [];
  const turns = 1.85;
  const steps = 44;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = -Math.PI * 0.5 + t * Math.PI * 2 * turns;
    const r = 235 * (1 - t * 0.72);
    spine.push(pt(cx + Math.cos(a) * r, 700 + Math.sin(a) * r * 0.62 - t * 210));
  }
  const bodyPath = taperedLimb(spine, 44, 132);
  const headC = spine[spine.length - 1];
  const head = blob(headC.x, headC.y - 46, 108, 96, g.wobble);

  const pieces: Piece[] = [
    { d: bodyPath, tone: "hide" },
    { d: head, tone: "hide" },
  ];
  const lines: string[] = [];
  // belly segmentation
  for (let i = 6; i < steps - 8; i += 4) {
    const p = spine[i];
    const d = norm(sub(spine[i + 1], spine[i - 1]));
    const n2 = pt(-d.y, d.x);
    const w = (44 + (132 - 44) * (i / steps)) * 0.42;
    lines.push(
      polyPath([add(p, mul(n2, w)), add(p, mul(n2, -w))], false)
    );
  }

  return {
    pieces,
    lines,
    head: { c: pt(headC.x, headC.y - 46), rx: 108, ry: 96 },
    bodyBox: { x: cx - 250, y: 460, w: 500, h: 400 },
    hornAnchor: pt(headC.x, headC.y - 128),
    tailAnchor: { p: spine[0], angle: 0 },
    wingAnchor: { p: pt(cx, 520) },
    baseline: GROUND,
  };
}

function plumed(g: Genome, rng: Rng): Anatomy {
  const bodyC = pt(500 + g.lean * 90, 590);
  const body = blob(bodyC.x, bodyC.y, 168, 208, g.wobble);
  const headC = pt(500 + g.lean * 180, 320);
  const head = blob(headC.x, headC.y, 106, 96, g.wobble.slice(5).concat(g.wobble.slice(0, 5)));
  const neck = taperedLimb([pt(bodyC.x, 440), pt(headC.x, 366)], 92, 96);

  const pieces: Piece[] = [
    { d: neck, tone: "hide" },
    { d: body, tone: "hide" },
    { d: head, tone: "hide" },
  ];
  const lines: string[] = [];

  // beak
  const bs = g.lean >= 0 ? 1 : -1;
  pieces.push({
    d: polyPath([
      pt(headC.x + bs * 74, headC.y - 16),
      pt(headC.x + bs * 168, headC.y + 20),
      pt(headC.x + bs * 70, headC.y + 46),
    ]),
    tone: "shade",
  });

  // folded wings
  for (const s of [-1, 1] as const) {
    pieces.push({
      d: smoothPath(
        [
          pt(bodyC.x + s * 40, 470),
          pt(bodyC.x + s * 172, 560),
          pt(bodyC.x + s * 150, 712),
          pt(bodyC.x + s * 66, 760),
        ],
        true,
        0.9
      ),
      tone: "shade",
    });
  }

  // legs
  for (const s of [-1, 1] as const) {
    const hip = pt(bodyC.x + s * 44, 760);
    const spine = [hip, pt(hip.x + s * 12, 840), pt(hip.x + s * 4, GROUND - 12)];
    pieces.push({ d: taperedLimb(spine, 26, 15), tone: "shade" });
    for (let k = -1; k <= 1; k++) {
      pieces.push({
        d: taperedLimb(
          [pt(hip.x + s * 4, GROUND - 14), pt(hip.x + s * 4 + k * 40, GROUND - 2)],
          14,
          6
        ),
        tone: "shade",
      });
    }
  }

  return {
    pieces,
    lines,
    head: { c: headC, rx: 106, ry: 96 },
    bodyBox: { x: bodyC.x - 168, y: bodyC.y - 208, w: 336, h: 416 },
    hornAnchor: pt(headC.x, headC.y - 84),
    tailAnchor: { p: pt(bodyC.x, 720), angle: Math.PI * 0.66 },
    wingAnchor: { p: pt(bodyC.x, 470) },
    baseline: GROUND,
  };
}

/* ------------------------------------------------------------------ */
/* Shared parts                                                        */
/* ------------------------------------------------------------------ */

function clawHand(tip: Pt, dir: number, size: number, rng: Rng): string {
  const fingers: string[] = [];
  for (let i = -1; i <= 1; i++) {
    const a = Math.PI * 0.5 + i * 0.42 + dir * 0.12;
    const end = pt(tip.x + Math.cos(a) * size * 1.5, tip.y + Math.sin(a) * size * 1.5);
    fingers.push(taperedLimb([tip, end], size * 0.5, size * 0.16));
  }
  void rng;
  return fingers.join("");
}

function foot(p: Pt, dir: number, size: number): string {
  return smoothPath(
    [
      pt(p.x - size * 0.42, p.y - size * 0.32),
      pt(p.x + dir * size * 0.95, p.y - size * 0.18),
      pt(p.x + dir * size * 0.9, p.y + size * 0.3),
      pt(p.x - size * 0.5, p.y + size * 0.3),
    ],
    true,
    0.7
  );
}

function hornPaths(g: Genome, anchor: Pt, headRx: number): Piece[] {
  const out: Piece[] = [];
  const push = (d: string) => out.push({ d, tone: "shade" });
  const s = headRx / 100;
  switch (g.horns) {
    case "single":
      push(
        taperedLimb(
          [anchor, pt(anchor.x + 8 * s, anchor.y - 74 * s), pt(anchor.x - 6 * s, anchor.y - 150 * s)],
          46 * s,
          4
        )
      );
      break;
    case "spikes":
      for (let i = -2; i <= 2; i++) {
        const x = anchor.x + i * 34 * s;
        const h = (78 - Math.abs(i) * 17) * s;
        push(taperedLimb([pt(x, anchor.y + 18 * s), pt(x + i * 6 * s, anchor.y - h)], 26 * s, 3));
      }
      break;
    case "antlers":
      for (const d of [-1, 1] as const) {
        const base = pt(anchor.x + d * 34 * s, anchor.y + 6 * s);
        const tip = pt(base.x + d * 92 * s, anchor.y - 132 * s);
        push(taperedLimb([base, pt(base.x + d * 30 * s, anchor.y - 70 * s), tip], 30 * s, 4));
        push(
          taperedLimb(
            [
              pt(base.x + d * 34 * s, anchor.y - 74 * s),
              pt(base.x + d * 106 * s, anchor.y - 68 * s),
            ],
            18 * s,
            3
          )
        );
        push(
          taperedLimb(
            [
              pt(base.x + d * 22 * s, anchor.y - 34 * s),
              pt(base.x + d * 96 * s, anchor.y - 6 * s),
            ],
            16 * s,
            3
          )
        );
      }
      break;
    case "curl":
      for (const d of [-1, 1] as const) {
        const spine: Pt[] = [];
        for (let i = 0; i <= 10; i++) {
          const t = i / 10;
          const a = Math.PI * (0.9 + t * 1.5) * d;
          spine.push(
            pt(
              anchor.x + d * 44 * s + Math.cos(a) * 74 * s * (1 - t * 0.35),
              anchor.y - 10 * s + Math.sin(a) * 62 * s * (1 - t * 0.3)
            )
          );
        }
        push(taperedLimb(spine, 38 * s, 6));
      }
      break;
    case "crown":
      for (let i = -3; i <= 3; i++) {
        const a = -Math.PI / 2 + i * 0.3;
        const base = pt(anchor.x + Math.cos(a) * 78 * s, anchor.y + 34 * s + Math.sin(a) * 26 * s);
        const tip = pt(base.x + Math.cos(a) * 56 * s, base.y + Math.sin(a) * 56 * s);
        push(taperedLimb([base, tip], 18 * s, 3));
      }
      break;
    default:
      break;
  }
  return out;
}

function tailPaths(g: Genome, a: { p: Pt; angle: number }): Piece[] {
  if (g.tail === "none") return [];
  const dir = a.p.x < 500 ? -1 : 1;
  const spine: Pt[] = [a.p];
  let cur = a.p;
  let ang = Math.PI * 0.15 * dir;
  for (let i = 0; i < 7; i++) {
    ang += 0.19 * dir + g.limbWobble[i % g.limbWobble.length] * 0.08;
    cur = pt(cur.x + Math.cos(ang) * 46 * dir * -1, cur.y + Math.sin(ang) * 46);
    spine.push(cur);
  }
  const out: Piece[] = [{ d: taperedLimb(spine, 56, 12), tone: "hide" }];
  const tip = spine[spine.length - 1];
  const d = norm(sub(tip, spine[spine.length - 2]));
  if (g.tail === "tuft") {
    for (let i = -1; i <= 1; i++) {
      const a2 = Math.atan2(d.y, d.x) + i * 0.5;
      out.push({
        d: taperedLimb([tip, pt(tip.x + Math.cos(a2) * 62, tip.y + Math.sin(a2) * 62)], 26, 4),
        tone: "shade",
      });
    }
  } else if (g.tail === "spade") {
    out.push({
      d: smoothPath(
        [
          tip,
          add(tip, mul(pt(-d.y, d.x), 44)),
          add(tip, mul(d, 78)),
          add(tip, mul(pt(d.y, -d.x), 44)),
        ],
        true,
        0.8
      ),
      tone: "shade",
    });
  } else if (g.tail === "fork") {
    for (const i of [-1, 1] as const) {
      const a2 = Math.atan2(d.y, d.x) + i * 0.42;
      out.push({
        d: taperedLimb([tip, pt(tip.x + Math.cos(a2) * 76, tip.y + Math.sin(a2) * 76)], 22, 3),
        tone: "hide",
      });
    }
  }
  return out;
}

function wingPaths(g: Genome, a: { p: Pt }): Piece[] {
  if (g.wings === "none") return [];
  const out: Piece[] = [];
  for (const s of [-1, 1] as const) {
    const root = pt(a.p.x + s * 40, a.p.y);
    if (g.wings === "bat") {
      const tipT = pt(root.x + s * 330, a.p.y - 220);
      const scallop: Pt[] = [root, pt(root.x + s * 190, a.p.y - 200), tipT];
      for (let i = 3; i >= 0; i--) {
        const t = i / 3;
        scallop.push(
          pt(
            root.x + s * (60 + t * 250),
            a.p.y - 40 + t * 30 + (i % 2 === 0 ? 70 : 12)
          )
        );
      }
      out.push({ d: smoothPath(scallop, true, 0.75), tone: "shade" });
    } else if (g.wings === "moth") {
      out.push({
        d: smoothPath(
          [
            root,
            pt(root.x + s * 150, a.p.y - 190),
            pt(root.x + s * 300, a.p.y - 96),
            pt(root.x + s * 268, a.p.y + 96),
            pt(root.x + s * 110, a.p.y + 120),
          ],
          true,
          0.9
        ),
        tone: "shade",
      });
    } else {
      out.push({
        d: smoothPath(
          [
            root,
            pt(root.x + s * 130, a.p.y - 110),
            pt(root.x + s * 176, a.p.y + 10),
            pt(root.x + s * 92, a.p.y + 78),
          ],
          true,
          0.85
        ),
        tone: "shade",
      });
    }
  }
  return out;
}

function eyeLayout(count: number, head: { c: Pt; rx: number; ry: number }): Pt[] {
  const { c, rx, ry } = head;
  const y0 = c.y - ry * 0.12;
  const spread = rx * 0.5;
  switch (count) {
    case 1:
      return [pt(c.x, y0)];
    case 2:
      return [pt(c.x - spread, y0), pt(c.x + spread, y0)];
    case 3:
      return [pt(c.x - spread, y0 + ry * 0.1), pt(c.x, y0 - ry * 0.3), pt(c.x + spread, y0 + ry * 0.1)];
    case 4:
      return [
        pt(c.x - spread * 1.1, y0 - ry * 0.22),
        pt(c.x + spread * 1.1, y0 - ry * 0.22),
        pt(c.x - spread * 0.62, y0 + ry * 0.24),
        pt(c.x + spread * 0.62, y0 + ry * 0.24),
      ];
    case 5:
      return [
        pt(c.x, y0 - ry * 0.38),
        pt(c.x - spread * 1.05, y0 - ry * 0.06),
        pt(c.x + spread * 1.05, y0 - ry * 0.06),
        pt(c.x - spread * 0.58, y0 + ry * 0.32),
        pt(c.x + spread * 0.58, y0 + ry * 0.32),
      ];
    default:
      return [
        pt(c.x - spread * 1.15, y0 - ry * 0.26),
        pt(c.x, y0 - ry * 0.38),
        pt(c.x + spread * 1.15, y0 - ry * 0.26),
        pt(c.x - spread * 0.9, y0 + ry * 0.24),
        pt(c.x, y0 + ry * 0.34),
        pt(c.x + spread * 0.9, y0 + ry * 0.24),
      ];
  }
}

/* ------------------------------------------------------------------ */

const ARCHETYPES = { lanky, hulk, crawler, wisp, coiled, plumed };

export type CreatureRender = { svg: string; topY: number; bottomY: number };

export function renderCreature(
  g: Genome,
  colors: CreatureColors,
  idPrefix: string
): CreatureRender {
  const rng = new Rng(g.wobble.map((w) => Math.round(w * 1000)).join(","));
  const anat = ARCHETYPES[g.archetype](g, rng);
  const p = g.palette;
  const { ink } = colors;

  const tone = (t: Piece["tone"]) =>
    t === "hide" ? p.hide : t === "shade" ? p.shade : p.accent;

  const pieces: Piece[] = [
    ...wingPaths(g, anat.wingAnchor),
    ...tailPaths(g, anat.tailAnchor),
    ...anat.pieces,
    ...hornPaths(g, anat.hornAnchor, anat.head.rx),
  ];

  /* Fit the silhouette into the frame so every archetype fills the plate the
     same amount, whatever its natural proportions are. */
  const FIT = { x0: 76, x1: 924, y0: 88, y1: anat.baseline };
  const bb = pathsBBox(pieces.map((pc) => pc.d));
  const bw = Math.max(1, bb.maxX - bb.minX);
  const bh = Math.max(1, bb.maxY - bb.minY);
  const fit = Math.min(
    Math.min((FIT.x1 - FIT.x0) / bw, (FIT.y1 - FIT.y0) / bh) * g.scale,
    1.7
  );
  const tx = (FIT.x0 + FIT.x1) / 2 - (bb.minX + bb.maxX) / 2 * fit;
  const ty = FIT.y1 - bb.maxY * fit;

  // Keep the ink outline visually constant regardless of the fit scale.
  const OUTLINE = 13 / fit;
  const clipId = `${idPrefix}-body`;

  const silhouette = pieces
    .map(
      (pc) =>
        `<path d="${pc.d}" fill="${ink}" stroke="${ink}" stroke-width="${OUTLINE * 2}" stroke-linejoin="round" stroke-linecap="round"/>`
    )
    .join("");

  const flats = pieces
    .map((pc) => `<path d="${pc.d}" fill="${tone(pc.tone)}"/>`)
    .join("");

  /* ---- markings, clipped to the body only ---- */
  const box = anat.bodyBox;
  const marks: string[] = [];
  const mr = new Rng(`${idPrefix}-marks`);
  if (g.markings === "spots") {
    for (let i = 0; i < 22; i++) {
      const r = mr.range(9, 26);
      marks.push(
        `<path d="${circle(mr.range(box.x, box.x + box.w), mr.range(box.y, box.y + box.h), r)}" fill="${p.shade}"/>`
      );
    }
  } else if (g.markings === "stripes") {
    for (let i = 0; i < 9; i++) {
      const y = box.y + (i / 9) * box.h + mr.range(-8, 8);
      marks.push(
        `<path d="${polyPath([
          pt(box.x - 40, y),
          pt(box.x + box.w + 40, y - 46),
          pt(box.x + box.w + 40, y - 22),
          pt(box.x - 40, y + 24),
        ])}" fill="${p.shade}"/>`
      );
    }
  } else if (g.markings === "bands") {
    for (let i = 0; i < 5; i++) {
      const y = box.y + ((i + 0.5) / 5) * box.h;
      marks.push(
        `<rect x="${fmt(box.x - 60)}" y="${fmt(y)}" width="${fmt(box.w + 120)}" height="${fmt(
          box.h * 0.07
        )}" fill="${p.shade}"/>`
      );
    }
  } else if (g.markings === "stars") {
    for (let i = 0; i < 16; i++) {
      const cx = mr.range(box.x, box.x + box.w);
      const cy = mr.range(box.y, box.y + box.h);
      const r = mr.range(11, 24);
      const spike: Pt[] = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const rr = k % 2 === 0 ? r : r * 0.34;
        spike.push(pt(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
      }
      marks.push(`<path d="${polyPath(spike)}" fill="${p.accent}"/>`);
    }
  }
  // A flat shadow side gives the flat colour some form.
  marks.push(
    `<path d="${blob(box.x + box.w * 1.34, box.y + box.h * 0.5, box.w * 0.78, box.h * 1.05, g.wobble)}" fill="${p.shade}" opacity="0.42"/>`
  );

  /* ---- face ---- */
  const face: string[] = [];
  const eyes = eyeLayout(g.eyes, anat.head);
  const er = Math.max(13, anat.head.rx * (0.3 - g.eyes * 0.021));
  for (const e of eyes) {
    if (g.eyeStyle === "void") {
      face.push(`<path d="${circle(e.x, e.y, er)}" fill="${ink}"/>`);
      face.push(`<path d="${circle(e.x, e.y, er * 0.42)}" fill="${p.accent}"/>`);
    } else {
      face.push(`<path d="${circle(e.x, e.y, er)}" fill="${p.accent}"/>`);
      if (g.eyeStyle === "pupil") {
        face.push(`<path d="${circle(e.x, e.y + er * 0.1, er * 0.44)}" fill="${ink}"/>`);
      } else if (g.eyeStyle === "slit") {
        face.push(
          `<path d="${smoothPath(
            [
              pt(e.x, e.y - er * 0.86),
              pt(e.x + er * 0.3, e.y),
              pt(e.x, e.y + er * 0.86),
              pt(e.x - er * 0.3, e.y),
            ],
            true
          )}" fill="${ink}"/>`
        );
      } else {
        face.push(
          `<path d="${circle(e.x, e.y, er * 0.66)}" fill="none" stroke="${ink}" stroke-width="${er * 0.3}"/>`
        );
      }
    }
  }

  const mouthY = anat.head.c.y + anat.head.ry * 0.52;
  const mw = anat.head.rx * 0.62;
  if (g.mouth === "grin") {
    face.push(
      `<path d="${teeth(pt(anat.head.c.x - mw, mouthY), pt(anat.head.c.x + mw, mouthY), 6, 26, 1)}" fill="${ink}"/>`
    );
  } else if (g.mouth === "line") {
    face.push(
      `<path d="${smoothPath(
        [
          pt(anat.head.c.x - mw, mouthY - 6),
          pt(anat.head.c.x, mouthY + 14),
          pt(anat.head.c.x + mw, mouthY - 6),
        ],
        false
      )}" fill="none" stroke="${ink}" stroke-width="11" stroke-linecap="round"/>`
    );
  } else if (g.mouth === "gape") {
    face.push(
      `<path d="${blob(anat.head.c.x, mouthY + 6, mw * 0.72, anat.head.ry * 0.3, [0, 0.04, -0.03, 0.05, 0, -0.04])}" fill="${ink}"/>`
    );
    face.push(
      `<path d="${teeth(
        pt(anat.head.c.x - mw * 0.6, mouthY - 12),
        pt(anat.head.c.x + mw * 0.6, mouthY - 12),
        5,
        20,
        1
      )}" fill="${p.accent}"/>`
    );
  } else {
    face.push(`<path d="${circle(anat.head.c.x, mouthY + 4, anat.head.rx * 0.16)}" fill="${ink}"/>`);
  }

  const lines = anat.lines
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round" opacity="0.75"/>`
    )
    .join("");

  const clipShapes = pieces.map((pc) => `<path d="${pc.d}"/>`).join("");

  const svg = `<g transform="translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(fit)})">
<defs><clipPath id="${clipId}">${clipShapes}</clipPath></defs>
${silhouette}
${flats}
<g clip-path="url(#${clipId})">${marks.join("")}</g>
${lines}
${face.join("")}
</g>`;

  return { svg, topY: ty + bb.minY * fit, bottomY: ty + bb.maxY * fit };
}

export const CREATURE_GROUND = GROUND;
