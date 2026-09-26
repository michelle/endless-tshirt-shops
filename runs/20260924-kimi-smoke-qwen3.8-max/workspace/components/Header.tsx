import Link from 'next/link';

export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#1f1c17" />
      <g fill="none" stroke="#e2703a" strokeWidth="2.6" strokeLinecap="round">
        <path d="M8 44 C 18 40, 22 50, 32 46 S 48 36, 56 42" />
        <path d="M11 36 C 20 31, 25 42, 33 38 S 47 27, 54 33" />
        <path d="M15 28 C 23 23, 27 33, 34 30 S 45 20, 51 25" />
        <path d="M20 21 C 26 17, 30 25, 35 22 S 42 15, 46 18" />
      </g>
      <circle cx="32" cy="34" r="3.4" fill="#f2c66d" />
    </svg>
  );
}

export default function Header({ compact = false }: { compact?: boolean }) {
  return (
    <header className="site-header container">
      <Link href="/" className="brand">
        <BrandMark />
        <span>
          <span className="brand-name">Lay of the Land</span>
          <br />
          <span className="brand-sub">Topographic portraits</span>
        </span>
      </Link>
      <nav className="site-nav">
        {!compact && (
          <>
            <a href="/#how">How it works</a>
            <a href="/#gallery">Gallery</a>
            <a href="/#tee">The tee</a>
          </>
        )}
        <Link href="/design" className="btn btn-accent" style={{ padding: '11px 22px' }}>
          Design yours
        </Link>
      </nav>
    </header>
  );
}
