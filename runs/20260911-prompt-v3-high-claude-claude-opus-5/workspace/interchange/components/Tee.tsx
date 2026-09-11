const SHIRT =
  "M 340,58 C 300,70 270,80 240,95 L 90,190 C 60,210 55,240 70,265 L 150,395 " +
  "C 165,420 195,425 215,408 L 280,352 L 280,1000 C 280,1030 300,1045 330,1045 " +
  "L 670,1045 C 700,1045 720,1030 720,1000 L 720,352 L 785,408 C 805,425 835,420 850,395 " +
  "L 930,265 C 945,240 940,210 910,190 L 760,95 C 730,80 700,70 660,58 " +
  "C 640,122 572,152 500,152 C 428,152 360,122 340,58 Z";

const COLLAR =
  "M 340,58 C 360,122 428,152 500,152 C 572,152 640,122 660,58 " +
  "C 636,74 578,86 500,86 C 422,86 364,74 340,58 Z";

/** Flat garment mockup. `art` is any absolutely-positionable node (img/svg). */
export function Tee({ color, children }: { color: string; children?: React.ReactNode }) {
  return (
    <div className="tee">
      <svg className="shape" viewBox="0 0 1000 1100" aria-hidden>
        <defs>
          <linearGradient id="teeShade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000" stopOpacity="0.20" />
            <stop offset="16%" stopColor="#000" stopOpacity="0.0" />
            <stop offset="84%" stopColor="#000" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <path d={SHIRT} fill={color} />
        <path d={SHIRT} fill="url(#teeShade)" />
        <path d={COLLAR} fill="#000" opacity="0.14" />
        <path d={SHIRT} fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="2.5" />
      </svg>
      <div className="art">{children}</div>
    </div>
  );
}
