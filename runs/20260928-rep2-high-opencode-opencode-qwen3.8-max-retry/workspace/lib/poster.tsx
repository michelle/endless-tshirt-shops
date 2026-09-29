import type { ReactElement } from 'react';
import {
  DesignInput,
  getPalette,
  skySeed,
  starField,
  constellation,
  shootingStar,
  moonPhase,
  formatDate,
  nightNumber,
} from './design';

/**
 * The night-sky poster, rendered as satori-compatible JSX. One component is
 * used for every size: the 700px live preview, the Stripe line-item image
 * and the 4677×5787 print file that Prodigi downloads. Everything is a pure
 * function of the design spec, so the same moment always renders the same sky.
 *
 * Units: u = width / 1000. The poster is width × (width × 1.25).
 */

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Shrink display type as the customer's words get longer. */
function fitSize(text: string, base: number, ref: number, power = 0.55): number {
  return base * Math.min(1, Math.pow(ref / Math.max(text.length, ref), power));
}

function Moon({ cx, cy, d, phase, light, dark }: {
  cx: number; cy: number; d: number; phase: number; light: string; dark: string;
}): ReactElement {
  const theta = 2 * Math.PI * phase;
  const cos = Math.cos(theta);
  const illumination = (1 - cos) / 2;
  const waxing = phase < 0.5;
  const E = Math.abs(cos) * d;
  const left = cx - d / 2;
  const top = cy - d / 2;

  const layers: ReactElement[] = [
    <div key="disc" style={{
      position: 'absolute', left, top, width: d, height: d,
      borderRadius: '50%', background: dark,
    }} />,
  ];

  if (illumination > 0.985) {
    layers.push(<div key="full" style={{
      position: 'absolute', left, top, width: d, height: d,
      borderRadius: '50%', background: light,
    }} />);
  } else if (illumination > 0.015) {
    // Lit semicircle on the correct limb…
    const semiLeft = waxing ? left + d / 2 : left;
    layers.push(
      <div key="semi" style={{
        position: 'absolute', left: semiLeft, top, width: d / 2, height: d,
        overflow: 'hidden', display: 'flex',
      }}>
        <div style={{
          width: d, height: d, borderRadius: '50%', background: light,
          marginLeft: waxing ? -d / 2 : 0,
        }} />
      </div>,
    );
    // …plus the terminator: a half-ellipse through the disc centre.
    // crescents: the ellipse is DARK and bites into the lit semicircle
    // (visible on the lit limb). gibbous: the ellipse is LIT and bulges
    // toward the dark limb (visible on the dark side of centre).
    const showRightHalf = (waxing && cos > 0) || (!waxing && cos < 0);
    layers.push(
      <div key="term" style={{
        position: 'absolute',
        left: showRightHalf ? left + d / 2 : left + (d - E) / 2,
        top, width: E / 2, height: d,
        overflow: 'hidden', display: 'flex',
      }}>
        <div style={{
          width: E, height: d, borderRadius: '50%',
          background: cos < 0 ? light : dark,
          marginLeft: showRightHalf ? -E / 2 : 0,
        }} />
      </div>,
    );
  }
  return <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>{layers}</div>;
}

export function Poster({ spec, width }: { spec: DesignInput; width: number }): ReactElement {
  const u = width / 1000;
  const height = width * 1.25;
  const p = getPalette(spec.palette);
  const seed = skySeed(spec.date, spec.place);
  const stars = starField(seed);
  const nodes = constellation(seed);
  const shoot = shootingStar(seed);
  const moon = moonPhase(spec.date);
  const place = spec.place.toUpperCase();
  const caption = spec.caption;
  const dateStr = formatDate(spec.date);
  const pct = Math.round(moon.illumination * 100);
  const night = nightNumber(seed);

  const cx = 500 * u;
  const cy = 170 * u;
  const d = 210 * u;

  // Constellation segments: midpoint, length, angle (px space, aspect-corrected).
  const segments = nodes.slice(0, -1).map((n, i) => {
    const m = nodes[i + 1];
    const x1 = n.x * 1000 * u;
    const y1 = n.y * 1250 * u;
    const x2 = m.x * 1000 * u;
    const y2 = m.y * 1250 * u;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, len, angle, i };
  });

  return (
    <div style={{
      width, height, position: 'relative', display: 'flex', overflow: 'hidden',
      borderRadius: 10 * u,
      background: `linear-gradient(to bottom, ${p.c1} 0%, ${p.c1} 15%, ${p.c2} 58%, ${p.c3} 100%)`,
      fontFamily: "'Cormorant Garamond'",
    }}>
      {/* Stars */}
      {stars.map((s, i) => (
        <div key={`s${i}`} style={{
          position: 'absolute',
          left: s.x * 1000 * u - s.r * 1000 * u,
          top: s.y * 1250 * u - s.r * 1000 * u,
          width: s.r * 2 * 1000 * u,
          height: s.r * 2 * 1000 * u,
          borderRadius: '50%',
          background: s.tinted ? hexToRgba(p.accent, s.a) : hexToRgba(p.star, s.a),
        }} />
      ))}

      {/* Shooting star */}
      <div style={{
        position: 'absolute',
        left: shoot.x * 1000 * u,
        top: shoot.y * 1250 * u,
        width: shoot.len * 1000 * u,
        height: 1.5 * u,
        background: `linear-gradient(to right, ${hexToRgba(p.star, 0)}, ${hexToRgba(p.star, 0.85)})`,
        transform: `rotate(${shoot.angle}deg)`,
        transformOrigin: '0% 50%',
      }} />

      {/* Constellation */}
      {segments.map((seg) => (
        <div key={`c${seg.i}`} style={{
          position: 'absolute',
          left: seg.x - seg.len / 2,
          top: seg.y - 0.6 * u,
          width: seg.len,
          height: 1.2 * u,
          background: hexToRgba(p.accent, 0.36),
          transform: `rotate(${seg.angle}deg)`,
          transformOrigin: '50% 50%',
        }} />
      ))}
      {nodes.map((n, i) => (
        <div key={`n${i}`} style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{
            position: 'absolute',
            left: n.x * 1000 * u - 4 * u, top: n.y * 1250 * u - 4 * u,
            width: 8 * u, height: 8 * u, borderRadius: '50%',
            background: hexToRgba(p.star, 0.14),
          }} />
          <div style={{
            position: 'absolute',
            left: n.x * 1000 * u - 1.7 * u, top: n.y * 1250 * u - 1.7 * u,
            width: 3.4 * u, height: 3.4 * u, borderRadius: '50%',
            background: hexToRgba(p.star, 0.95),
          }} />
        </div>
      ))}

      {/* Moon glow + moon */}
      <div style={{
        position: 'absolute', left: cx - d * 1.15, top: cy - d * 1.15,
        width: d * 2.3, height: d * 2.3, borderRadius: '50%',
        background: hexToRgba(p.moonLight, 0.05),
      }} />
      <div style={{
        position: 'absolute', left: cx - d * 0.82, top: cy - d * 0.82,
        width: d * 1.64, height: d * 1.64, borderRadius: '50%',
        background: hexToRgba(p.moonLight, 0.06),
      }} />
      <Moon cx={cx} cy={cy} d={d} phase={moon.phase} light={p.moonLight} dark={p.moonDark} />

      {/* Horizon glow */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 96 * u, height: 74 * u,
        background: `linear-gradient(to top, ${hexToRgba(p.accent, 0.08)}, ${hexToRgba(p.accent, 0)})`,
        display: 'flex',
      }} />

      {/* Legibility gradient behind the typography */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 420, display: 'flex',
        background: `linear-gradient(to top, ${p.c3} 0%, ${hexToRgba(p.c3, 0.85)} 45%, ${hexToRgba(p.c3, 0)} 100%)`,
      }} />

      {/* Hills */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 * u,
        overflow: 'hidden', display: 'flex',
      }}>
        <div style={{
          position: 'absolute', left: -320 * u, top: 12 * u,
          width: 900 * u, height: 900 * u, borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.30)',
        }} />
        <div style={{
          position: 'absolute', left: 200 * u, top: -10 * u,
          width: 800 * u, height: 800 * u, borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.40)',
        }} />
        <div style={{
          position: 'absolute', left: 560 * u, top: 24 * u,
          width: 950 * u, height: 950 * u, borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.55)',
        }} />
      </div>

      {/* Frame */}
      <div style={{
        position: 'absolute', left: 26 * u, top: 26 * u,
        width: 948 * u, height: 1198 * u,
        border: `${1.6 * u}px solid ${hexToRgba(p.accent, 0.34)}`,
        borderRadius: 6 * u,
        display: 'flex',
      }} />

      {/* Typography */}
      <div style={{
        position: 'absolute', left: 70 * u, right: 70 * u, bottom: 56 * u,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          display: 'flex', fontFamily: "'Inter'", fontWeight: 500,
          fontSize: 20 * u, letterSpacing: '0.38em',
          color: hexToRgba(p.accent, 0.9),
        }}>
          THE NIGHT OF
        </div>
        <div style={{
          display: 'flex', marginTop: 12 * u, textAlign: 'center',
          fontWeight: 600, fontSize: fitSize(place, 76 * u, 13),
          letterSpacing: '0.12em', color: p.ink,
        }}>
          {place}
        </div>
        <div style={{
          display: 'flex', width: 170 * u, height: 1.4 * u,
          marginTop: 18 * u, background: hexToRgba(p.accent, 0.5),
        }} />
        {caption ? (
          <div style={{
            display: 'flex', marginTop: 16 * u, textAlign: 'center',
            fontStyle: 'italic', fontWeight: 400,
            fontSize: fitSize(caption, 33 * u, 28),
            color: hexToRgba(p.soft, 0.92),
          }}>
            {caption}
          </div>
        ) : null}
        <div style={{
          display: 'flex', marginTop: 20 * u, fontFamily: "'Inter'", fontWeight: 400,
          fontSize: 18 * u, letterSpacing: '0.22em',
          color: hexToRgba(p.soft, 0.8),
        }}>
          {`${dateStr} · ${moon.name.toUpperCase()} · ${pct}% LIT`}
        </div>
        <div style={{
          display: 'flex', marginTop: 14 * u, fontFamily: "'Inter'", fontWeight: 500,
          fontSize: 14 * u, letterSpacing: '0.34em',
          color: hexToRgba(p.star, 0.45),
        }}>
          {`MOONWORN · Nº ${night} · ONE OF ONE`}
        </div>
      </div>
    </div>
  );
}
