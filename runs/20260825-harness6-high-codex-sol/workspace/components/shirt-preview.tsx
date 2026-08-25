"use client";

import type { ShirtStyle } from "@/lib/catalog";

export function ShirtPreview({ timestamp, style, frozen }: { timestamp: number; style: ShirtStyle; frozen: boolean }) {
  const fittedPath = "M82 17c-4-3-18-8-18-8s-3 10-12 10S40 9 40 9 25 14 21 17L5 36l15 12 9-10c3 18 5 38-1 65 15 5 34 5 49 0-6-28-4-48-1-65l9 10 14-13z";
  const unisexPath = "M80 13c-5-3-16-7-16-7S58 19 52 19 40 6 40 6 28 9 22 13L2 35l17 13 10-10v66c15 5 32 5 47 0V38l10 10 16-13z";

  return (
    <div className="preview-card" aria-label={`${style} black t-shirt preview showing timestamp ${timestamp}`}>
      <div className="edition-tag">
        <span className={frozen ? "status-dot status-dot--frozen" : "status-dot"} />
        {frozen ? "Moment captured" : "Live edition"}
      </div>
      <div className="shirt-wrap">
        <svg className="shirt" viewBox="0 0 104 124" role="img" aria-label="Black t-shirt">
          <defs>
            <linearGradient id="shirt-shade" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#252525" />
              <stop offset="0.5" stopColor="#090909" />
              <stop offset="1" stopColor="#1b1b1b" />
            </linearGradient>
            <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1a1815" floodOpacity=".22" />
            </filter>
          </defs>
          <path d={style === "fitted" ? fittedPath : unisexPath} fill="url(#shirt-shade)" filter="url(#shadow)" />
          <path d="M40 8c2 7 7 11 12 11S62 15 64 8" fill="none" stroke="#373737" strokeWidth="1.4" />
        </svg>
        <div className={`shirt-art shirt-art--${style}`}>
          <span>{timestamp}</span>
        </div>
      </div>
      <div className="preview-caption">
        <span>13 digits</span>
        <span className="caption-rule" />
        <span>1 exact moment</span>
      </div>
    </div>
  );
}
