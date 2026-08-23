"use client";

import type { ShirtStyle } from "@/lib/product";

const paths: Record<ShirtStyle, string> = {
  fitted:
    "M170 92C185 70 223 54 284 35c15 27 40 43 76 43s61-16 76-43c61 19 99 35 114 57l82 117-91 66-52-65c-5 63-1 126 17 220-83 28-209 28-292 0 18-94 22-157 17-220l-52 65-91-66 82-117Z",
  unisex:
    "M166 82C186 62 226 47 286 31c17 30 41 47 74 47s57-17 74-47c60 16 100 31 120 51l99 105-88 79-70-65v242c-86 25-184 25-270 0V201l-70 65-88-79 99-105Z",
};

export function ShirtPreview({ style, timestamp }: { style: ShirtStyle; timestamp: number }) {
  return (
    <div className="shirt-stage" aria-label={`Black ${style} t-shirt preview printed with timestamp ${timestamp}`}>
      <div className="shirt-shadow" />
      <svg className="shirt-svg" viewBox="0 0 720 520" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="shirtBlack" x1="180" y1="20" x2="530" y2="500" gradientUnits="userSpaceOnUse">
            <stop stopColor="#303030" />
            <stop offset="0.45" stopColor="#080808" />
            <stop offset="1" stopColor="#181818" />
          </linearGradient>
          <filter id="shirtDrop" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="18" stdDeviation="17" floodColor="#15120d" floodOpacity=".24" />
          </filter>
        </defs>
        <path d={paths[style]} fill="url(#shirtBlack)" filter="url(#shirtDrop)" />
        <path d="M286 31c17 30 41 47 74 47s57-17 74-47c-4 47-31 73-74 73s-70-26-74-73Z" fill="#050505" opacity=".86" />
        <path d="M289 33c20 22 43 34 71 34s51-12 71-34" fill="none" stroke="#515151" strokeWidth="3" opacity=".6" />
        <text x="360" y="183" textAnchor="middle" fill="white" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="31" letterSpacing="1.2">
          {timestamp}
        </text>
        <text x="360" y="212" textAnchor="middle" fill="#999" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="3">
          UNIX TIME · MILLISECONDS
        </text>
      </svg>
      <div className="preview-caption"><span>LIVE PREVIEW</span><span>01 / 01</span></div>
    </div>
  );
}
