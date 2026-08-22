export type ShirtStyle = "fitted" | "unisex";

export function ShirtPreview({ timestamp, style, frozen }: { timestamp: number; style: ShirtStyle; frozen: boolean }) {
  const fittedPath = "M131 74C153 59 184 48 217 38c11 29 34 45 63 45s52-16 63-45c34 10 64 21 87 36l54 78-62 43-27-34c-6 62-1 140 14 231-74 23-184 23-258 0 16-91 20-169 14-231l-27 34-62-43 55-78Z";
  const unisexPath = "M127 73c28-17 60-28 102-38 8 29 25 43 51 43s43-14 51-43c42 10 74 21 102 38l58 82-64 46-31-40 8 229c-77 23-171 23-248 0l8-229-31 40-64-46 58-82Z";

  return (
    <div className="preview-shell">
      <div className="preview-label"><span className={frozen ? "dot frozen" : "dot"}/>{frozen ? "Timestamp locked" : "Live preview"}</div>
      <svg className="shirt-svg" viewBox="0 0 560 470" role="img" aria-label={`Black ${style} t-shirt printed with timestamp ${timestamp}`}>
        <defs>
          <linearGradient id="fabric" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#25262a"/><stop offset=".52" stopColor="#08090a"/><stop offset="1" stopColor="#202124"/></linearGradient>
          <radialGradient id="glow"><stop offset="0" stopColor="#ffffff" stopOpacity=".11"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="20" stdDeviation="15" floodOpacity=".28"/></filter>
          <filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>
        </defs>
        <ellipse cx="280" cy="429" rx="175" ry="20" fill="#1d1710" opacity=".14" filter="url(#soft)"/>
        <path d={style === "fitted" ? fittedPath : unisexPath} fill="url(#fabric)" filter="url(#shadow)"/>
        <path d={style === "fitted" ? fittedPath : unisexPath} fill="url(#glow)" opacity=".55"/>
        <path d="M222 38c12 35 30 53 58 53s46-18 58-53" fill="none" stroke="#343539" strokeWidth="5"/>
        <path d="M228 40c11 21 28 31 52 31s41-10 52-31" fill="#111214"/>
        <text x="280" y="176" textAnchor="middle" fill="#f6f1e8" fontFamily="var(--font-mono), monospace" fontSize="21" fontWeight="600" letterSpacing=".4">{timestamp}</text>
        <text x="280" y="203" textAnchor="middle" fill="#f6f1e8" opacity=".65" fontFamily="var(--font-mono), monospace" fontSize="8.5" letterSpacing="2.1">THIS EXACT MOMENT</text>
      </svg>
      <p className="preview-caption">Your order time is captured to the millisecond and printed in warm white ink.</p>
    </div>
  );
}
