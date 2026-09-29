/**
 * Flat-illustration tee mockup: the customer's colour, with their poster
 * rendered on the chest. Pure presentational — no state.
 */
export function ShirtMockup({ colorHex, posterUrl }: { colorHex: string; posterUrl: string | null }) {
  const isWhite = colorHex.toLowerCase() === '#f2f0e9';
  return (
    <div className="relative w-full" style={{ aspectRatio: '600 / 660' }}>
      <svg
        viewBox="0 0 600 660"
        className="absolute inset-0 h-full w-full"
        style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.45))' }}
        role="img"
        aria-label="T-shirt mockup"
      >
        <defs>
          <linearGradient id="teeShade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <path
          d="M 205 64
             C 240 96 360 96 395 64
             L 472 86
             L 556 190
             L 512 300
             L 452 268
             L 462 616
             Q 300 630 138 616
             L 148 268
             L 88 300
             L 44 190
             L 128 86
             Z"
          fill={colorHex}
        />
        <path
          d="M 205 64
             C 240 96 360 96 395 64
             L 472 86
             L 556 190
             L 512 300
             L 452 268
             L 462 616
             Q 300 630 138 616
             L 148 268
             L 88 300
             L 44 190
             L 128 86
             Z"
          fill="url(#teeShade)"
        />
        {/* collar */}
        <path d="M 205 64 C 240 96 360 96 395 64" fill="none" stroke="rgba(0,0,0,0.30)" strokeWidth="4" strokeLinecap="round" />
        <path d="M 205 64 C 240 48 360 48 395 64" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="3" strokeLinecap="round" />
        {/* sleeve hems */}
        <path d="M 546 196 L 506 292" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="2.5" />
        <path d="M 54 196 L 94 292" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="2.5" />
        {/* bottom hem stitch */}
        <path d="M 141 604 Q 300 618 459 604" fill="none" stroke={isWhite ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'} strokeWidth="2.5" />
      </svg>
      {/* chest print — the poster, 1:1.25 aspect, centred on the torso */}
      <div
        className="absolute overflow-hidden"
        style={{ left: '31.5%', top: '24.8%', width: '37%' }}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt="Your night-sky design preview" className="block w-full" />
        ) : (
          <div className="flex w-full items-center justify-center rounded-sm bg-night-800/60 text-xs text-mist-500" style={{ aspectRatio: '700 / 875' }}>
            composing your sky…
          </div>
        )}
      </div>
    </div>
  );
}
