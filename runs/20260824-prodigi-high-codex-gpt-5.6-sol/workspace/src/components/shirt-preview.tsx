import type { ShirtStyle } from "@/lib/products";

const fittedPath =
  "M79.312 15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31 8.721-11.66 8.721-11.66-8.721-11.66-8.721-15.354 4.936-16.486 6.068C22.259 16.201 9.677 32.063 9.677 32.063l10.081 8.37 6.614-5.518s14.411 23.971 1.384 58.875c0 0 43.546 10.767 47.434 0-9.689-43.26 1.379-58.613 1.379-58.613l6.267 5.228 9.35-11.117S80.945 16.781 79.312 15.149z";
const unisexPath =
  "M79.313 6.142C77.683 4.511 63.196 4 63.196 4s-9.844 13.724-11.661 13.724C49.719 17.724 39.875 4 39.875 4S24.521 4.932 23.389 6.064C22.259 7.194.562 30.954.562 30.954L16.71 42.975l9.662-8.06 1.384 58.875s43.541 10.705 47.433 0l1.379-58.613 9.347 7.797L100 30.953S80.945 7.774 79.313 6.142z";

export function ShirtPreview({ style, timestamp }: { style: ShirtStyle; timestamp: string }) {
  return (
    <div className="shirt-stage" aria-label={`Black ${style} shirt showing ${timestamp}`}>
      <div className="shirt-halo" />
      <svg className="shirt-svg" viewBox="0 0 100 112" role="img" aria-hidden="true">
        <defs>
          <filter id="shirt-shadow" x="-30%" y="-20%" width="160%" height="170%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity=".22" />
          </filter>
          <linearGradient id="shirt-black" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#242321" />
            <stop offset=".5" stopColor="#070706" />
            <stop offset="1" stopColor="#181715" />
          </linearGradient>
        </defs>
        <g filter="url(#shirt-shadow)">
          <path d={style === "fitted" ? fittedPath : unisexPath} fill="url(#shirt-black)" />
        </g>
        <path
          d="M40 8.8c2.9 5.5 6.8 8.3 11.6 8.3 4.7 0 8.6-2.8 11.5-8.3"
          fill="none"
          stroke="#373532"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <text
          x="51.5"
          y={style === "fitted" ? "29" : "29.5"}
          fill="white"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="5.35"
          fontWeight="600"
          letterSpacing=".1"
          textAnchor="middle"
        >
          {timestamp}
        </text>
      </svg>
      <div className="timestamp-caption">
        <span className="pulse-dot" /> live Unix time · milliseconds
      </div>
    </div>
  );
}
