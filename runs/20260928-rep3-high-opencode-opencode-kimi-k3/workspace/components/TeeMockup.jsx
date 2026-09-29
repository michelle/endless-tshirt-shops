'use client';

// Flat-lay t-shirt mockup (vector, drawn in-house) with the live artwork
// composited on the chest.
import { useId } from 'react';
import ArtworkCanvas from './ArtworkCanvas';

const BODY =
  'M168,84 C190,68 232,60 280,60 C328,60 370,68 392,84 L478,136 C492,144 497,160 491,174 L444,270 C438,284 424,289 412,282 L396,272 L396,552 C396,568 385,576 370,576 L190,576 C175,576 164,568 164,552 L164,272 L148,282 C136,289 122,284 116,270 L69,174 C63,160 68,144 82,136 Z';

export default function TeeMockup({ hex, design, artWidth = 560 }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gid = `teeShade-${uid}`;
  const bid = `teeBase-${uid}`;
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 520, margin: '0 auto' }}>
      <svg viewBox="0 0 560 620" style={{ width: '100%', height: 'auto' }} aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="0.4" stopColor="#ffffff" stopOpacity="0.015" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.14" />
          </linearGradient>
          <linearGradient id={bid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.07" />
          </linearGradient>
        </defs>
        <ellipse cx="280" cy="598" rx="215" ry="11" fill="#000" opacity="0.35" />
        <g>
          <path d={BODY} fill={hex} />
          <path d={BODY} fill={`url(#${bid})`} />
          <path d={BODY} fill={`url(#${gid})`} />
          {/* crew neck rib */}
          <path d="M232,63 C246,96 314,96 328,63 C314,84 246,84 232,63 Z" fill="#000" opacity="0.3" />
          <path d="M232,63 C246,96 314,96 328,63" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="2" />
          {/* collar shoulder seams */}
          <path d="M232,63 L168,84 M328,63 L392,84" stroke="#000" strokeOpacity="0.14" strokeWidth="1.5" fill="none" />
          {/* sleeve hems */}
          <path d="M429,259 L478,166 M131,259 L82,166" stroke="#000" strokeOpacity="0.18" strokeWidth="2.5" fill="none" />
          {/* armpit seams */}
          <path d="M164,272 L148,282 M396,272 L412,282" stroke="#000" strokeOpacity="0.16" strokeWidth="2" fill="none" />
          {/* hem */}
          <path d="M176,560 L384,560" stroke="#000" strokeOpacity="0.22" strokeWidth="2.5" />
          {/* gentle fabric folds */}
          <path d="M210,320 C220,390 216,470 208,545 M350,320 C342,395 346,470 354,545"
            stroke="#000" strokeOpacity="0.05" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M255,340 C261,400 259,470 255,530" stroke="#fff" strokeOpacity="0.045" strokeWidth="7" strokeLinecap="round" fill="none" />
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          left: '50%', top: '21%',
          width: '42%', transform: 'translateX(-50%)',
        }}
      >
        <ArtworkCanvas design={design} width={artWidth} />
      </div>
    </div>
  );
}
