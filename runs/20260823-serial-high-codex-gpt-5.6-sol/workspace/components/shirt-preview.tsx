"use client";

type Props = {
  fit: "fitted" | "unisex";
  timestamp: number;
  paused: boolean;
};

const paths = {
  fitted:
    "M79.312 15.149C77.683 13.518 63.195 9 63.195 9s-4.31 8.72-11.66 8.72S39.875 9 39.875 9 24.52 13.94 23.39 15.07C22.26 16.2 9.68 32.06 9.68 32.06l10.08 8.37 6.61-5.52s14.41 23.97 1.39 58.88c0 0 43.54 10.76 47.43 0-9.69-43.26 1.38-58.61 1.38-58.61l6.27 5.23 9.35-11.12s-11.24-12.51-12.88-14.14Z",
  unisex:
    "M79.313 6.142C77.683 4.511 63.196 4 63.196 4s-9.844 13.724-11.661 13.724C49.719 17.724 39.875 4 39.875 4S24.521 4.932 23.389 6.064C22.259 7.194.562 30.954.562 30.954L16.71 42.975l9.662-8.06 1.384 58.875s43.541 10.705 47.433 0l1.379-58.613 9.347 7.797L100 30.953S80.945 7.774 79.313 6.142Z",
};

const digitSegments: Record<string, string[]> = {
  "0": ["a", "b", "c", "d", "e", "f"], "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"], "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"], "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "c", "d"], "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"], "9": ["a", "b", "c", "d", "f", "g"],
};
const segmentLines: Record<string, [number, number, number, number]> = {
  a: [16, 8, 84, 8], b: [94, 18, 94, 88], c: [94, 112, 94, 182],
  d: [16, 192, 84, 192], e: [6, 112, 6, 182], f: [6, 18, 6, 88], g: [16, 100, 84, 100],
};

function DigitalTimestamp({ value }: { value: number }) {
  const digits = String(value);
  const width = digits.length * 138 - 38;
  return (
    <svg className="print-value" viewBox={`0 0 ${width} 200`} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round">
        {[...digits].flatMap((digit, index) => digitSegments[digit].map((segment) => {
          const [x1, y1, x2, y2] = segmentLines[segment];
          return <line key={`${index}-${segment}`} x1={x1 + index * 138} y1={y1} x2={x2 + index * 138} y2={y2} />;
        }))}
      </g>
    </svg>
  );
}

export function ShirtPreview({ fit, timestamp, paused }: Props) {
  return (
    <div className="shirt-stage" aria-label={`Black ${fit} shirt preview printed with timestamp ${timestamp}`}>
      <div className="stage-grid" aria-hidden="true" />
      <span className="stage-tag tag-one">UNIX / MS</span>
      <span className="stage-tag tag-two">ONE OF ONE</span>
      <span className="stage-index" aria-hidden="true">01</span>
      <div className={`shirt-wrap ${fit}`}>
        <svg className="shirt-svg" viewBox="0 0 100 110" role="img" aria-hidden="true">
          <defs>
            <filter id="shadow" x="-30%" y="-20%" width="160%" height="170%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#111" floodOpacity=".22" />
            </filter>
            <linearGradient id="shirt-black" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#242424" />
              <stop offset=".5" stopColor="#080808" />
              <stop offset="1" stopColor="#181818" />
            </linearGradient>
          </defs>
          <path d={paths[fit]} fill="url(#shirt-black)" filter="url(#shadow)" />
          <path d={paths[fit]} fill="none" stroke="#333" strokeWidth=".35" opacity=".85" />
        </svg>
        <div className="shirt-print">
          <DigitalTimestamp value={timestamp} />
          <span className="print-rule" />
          <span className="print-caption">THIS EXACT MOMENT</span>
        </div>
      </div>
      <div className={`live-pill ${paused ? "paused" : ""}`}>
        <span className="live-dot" />
        {paused ? "timestamp held" : "printing live"}
      </div>
    </div>
  );
}
