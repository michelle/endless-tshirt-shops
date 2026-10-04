'use client'

import SkyChart from './SkyChart'

// Flat-lay tee silhouette, drawn from a mirrored half-path so the
// garment stays perfectly symmetric. The design SVG is overlaid as HTML
// on the chest area, so it scales with the mockup exactly.

function mirrorHalfD(half) {
  const mx = (x) => 1000 - x
  let d = ''
  for (const cmd of half) {
    if (cmd[0] === 'M') d += `M ${cmd[1]},${cmd[2]} `
    else d += `C ${cmd[1]},${cmd[2]} ${cmd[3]},${cmd[4]} ${cmd[5]},${cmd[6]} `
  }
  // endpoints of each command (implicit start = previous endpoint)
  const ends = [[half[0][1], half[0][2]]]
  for (let i = 1; i < half.length; i++) ends.push([half[i][5], half[i][6]])
  // mirrored, reversed traversal back up the right side
  for (let i = half.length - 1; i >= 1; i--) {
    const c = half[i]
    const prev = ends[i - 1]
    d += `C ${mx(c[3])},${c[4]} ${mx(c[1])},${c[2]} ${mx(prev[0])},${prev[1]} `
  }
  return d + 'Z'
}

const TEE_HALF = [
  ['M', 400, 148],
  ['C', 356, 148, 322, 158, 298, 178], // shoulder slope
  ['C', 284, 190, 266, 198, 246, 212], // out to shoulder tip
  ['C', 208, 244, 172, 300, 156, 362], // sleeve outer, upper
  ['C', 142, 416, 138, 462, 150, 494], // sleeve outer, to cuff
  ['C', 157, 512, 170, 518, 185, 516], // cuff, outer corner
  ['L', 250, 500], // cuff band
  ['C', 266, 495, 277, 483, 283, 463], // cuff, inner corner
  ['C', 290, 440, 294, 419, 298, 407], // sleeve inner edge, up to armpit
  ['C', 303, 395, 300, 412, 292, 452], // into the side seam
  ['C', 279, 545, 271, 690, 268, 826], // body side
  ['C', 266, 938, 267, 1028, 268, 1050], // down to the hem
  ['C', 268, 1074, 280, 1086, 302, 1088], // hem corner
]

const TEE_D = mirrorHalfD(TEE_HALF)

export default function ShirtMockup({ spec, color }) {
  return (
    <div className="shirt-stage">
      <div style={{ position: 'relative', aspectRatio: '1000 / 1150' }}>
        <svg viewBox="0 0 1000 1150" style={{ display: 'block', width: '100%', height: 'auto' }}>
          <defs>
            <linearGradient id="fabShade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#000" stopOpacity="0.16" />
              <stop offset="14%" stopColor="#000" stopOpacity="0.03" />
              <stop offset="30%" stopColor="#000" stopOpacity="0" />
              <stop offset="70%" stopColor="#000" stopOpacity="0" />
              <stop offset="86%" stopColor="#000" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.16" />
            </linearGradient>
            <radialGradient id="chestLight" cx="0.5" cy="0.34" r="0.55">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* main garment */}
          <path d={TEE_D} fill={color.hex} />
          <path d={TEE_D} fill="url(#fabShade)" />
          <path d={TEE_D} fill="url(#chestLight)" />
          {/* collar */}
          <path d="M 400,148 C 436,120 564,120 600,148 C 564,196 436,196 400,148 Z" fill="#00000033" />
          <path
            d="M 400,148 C 436,214 564,214 600,148"
            fill="none"
            stroke={color.hex}
            strokeWidth="30"
            strokeLinecap="round"
          />
          <path
            d="M 404,150 C 438,206 562,206 596,150"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.14"
            strokeWidth="3"
          />
          {/* subtle seams */}
          <path d="M 298,407 C 290,440 284,545 279,690" fill="none" stroke="#00000055" strokeWidth="3" />
          <path d="M 702,407 C 710,440 716,545 721,690" fill="none" stroke="#00000055" strokeWidth="3" />
          <path d="M 268,1052 L 732,1052" stroke="#00000044" strokeWidth="4" fill="none" />
          <path d="M 185,516 L 250,500" stroke="#00000044" strokeWidth="3" fill="none" />
          <path d="M 815,516 L 750,500" stroke="#00000044" strokeWidth="3" fill="none" />
          {/* soft fold hints */}
          <path
            d="M 420,560 C 400,700 402,860 424,1000"
            fill="none"
            stroke="#00000030"
            strokeWidth="26"
          />
          <path
            d="M 590,600 C 606,730 604,880 584,1010"
            fill="none"
            stroke="#00000026"
            strokeWidth="22"
          />
        </svg>
        {/* the customer's design, overlaid on the chest print area */}
        <div
          style={{
            position: 'absolute',
            left: '28%',
            top: '23.5%',
            width: '44%',
          }}
        >
          <SkyChart spec={spec} />
        </div>
      </div>
    </div>
  )
}
