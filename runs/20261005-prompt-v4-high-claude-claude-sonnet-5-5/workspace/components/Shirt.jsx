// Illustrative t-shirt mockup: a flat silhouette in the chosen colour with the design placed
// where it prints (about 11.2" wide on a ~20" chest).
export default function Shirt({ color, tone, src, alt }) {
  const edge = tone === 'dark' ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.16)';
  const shade = tone === 'dark' ? 'rgba(0,0,0,.28)' : 'rgba(0,0,0,.09)';
  const hi = tone === 'dark' ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.55)';
  return (
    <div className="mock">
      <svg className="shirt" viewBox="0 0 600 640" role="img" aria-label={`${alt} shirt mockup`}>
        <defs>
          <radialGradient id="lite" cx="50%" cy="25%" r="75%">
            <stop offset="0" stopColor={hi} />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <path
          d="M150 34 L90 57 L15 135 L75 190 L120 150 L120 600 Q120 615 135 615 L465 615 Q480 615 480 600 L480 150 L525 190 L585 135 L510 57 L450 34 L370 28 Q300 96 230 28 Z"
          fill={color}
          stroke={edge}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M150 34 L90 57 L15 135 L75 190 L120 150 L120 600 Q120 615 135 615 L465 615 Q480 615 480 600 L480 150 L525 190 L585 135 L510 57 L450 34 L370 28 Q300 96 230 28 Z"
          fill="url(#lite)"
        />
        <path d="M230 28 Q300 96 370 28" fill="none" stroke={edge} strokeWidth="9" strokeLinecap="round" />
        <path d="M120 150 Q122 100 150 60" fill="none" stroke={edge} strokeWidth="1.5" />
        <path d="M480 150 Q478 100 450 60" fill="none" stroke={edge} strokeWidth="1.5" />
        <path d="M130 585 L470 585" stroke={edge} strokeWidth="1.2" />
        <path d="M200 520 Q230 380 215 260" fill="none" stroke={shade} strokeWidth="14" strokeLinecap="round" opacity=".35" />
        <path d="M410 540 Q380 400 395 290" fill="none" stroke={shade} strokeWidth="14" strokeLinecap="round" opacity=".3" />
      </svg>
      {src ? <img className="art" src={src} alt={alt} /> : null}
    </div>
  );
}
