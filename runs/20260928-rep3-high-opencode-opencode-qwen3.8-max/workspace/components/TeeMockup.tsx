'use client';

// Flat t-shirt mockup with the live design composited onto the chest.
export default function TeeMockup({
  svg,
  hex,
  light,
}: {
  svg: string | null;
  hex: string;
  light: boolean;
}) {
  const dataUri = svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    : null;
  const seam = light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.14)';
  return (
    <svg className="mockup" viewBox="0 0 600 660" role="img" aria-label="T-shirt preview with your personalised star chart">
      <defs>
        <clipPath id="chestClip">
          <rect x="185" y="160" width="230" height="325" rx="4" />
        </clipPath>
      </defs>
      {/* shirt body */}
      <path
        d="M225,58 C232,96 260,112 300,112 C340,112 368,96 375,58 L482,92 L556,214 L488,252 L462,206 L462,596 C462,608 454,614 444,614 L156,614 C146,614 138,608 138,596 L138,206 L112,252 L44,214 L118,92 Z"
        fill={hex}
        stroke={seam}
        strokeWidth="2"
      />
      {/* collar rib */}
      <path
        d="M225,58 C232,96 260,112 300,112 C340,112 368,96 375,58"
        fill="none"
        stroke={seam}
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* sleeve seams */}
      <path d="M138,206 L112,252" fill="none" stroke={seam} strokeWidth="2" />
      <path d="M462,206 L488,252" fill="none" stroke={seam} strokeWidth="2" />
      {/* hem */}
      <path d="M138,590 L462,590" fill="none" stroke={seam} strokeWidth="2" />
      {dataUri && (
        <image
          href={dataUri}
          x="185"
          y="160"
          width="230"
          height="325"
          clipPath="url(#chestClip)"
          preserveAspectRatio="xMidYMid meet"
        />
      )}
    </svg>
  );
}
