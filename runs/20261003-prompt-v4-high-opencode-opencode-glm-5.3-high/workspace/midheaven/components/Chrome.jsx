import Link from 'next/link'

export function Spark({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 1 L13.35 10.65 L23 12 L13.35 13.35 L12 23 L10.65 13.35 L1 12 L10.65 10.65 Z"
        fill={color}
      />
    </svg>
  )
}

export function Header() {
  return (
    <header className="site-head">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="Midheaven home">
          <Spark size={17} color="#d9c8a0" />
          MIDHEAVEN
        </Link>
        <nav className="nav">
          <Link href="/#how">How it works</Link>
          <Link href="/#gallery">Gallery</Link>
          <Link href="/#quality">The shirt</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>
        <Link href="/create" className="btn" style={{ padding: '11px 22px', fontSize: 14 }}>
          Create yours
        </Link>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="wrap foot-grid">
        <div className="logo" style={{ letterSpacing: '0.3em', fontSize: 16 }}>
          <Spark size={14} color="#d9c8a0" />
          MIDHEAVEN
        </div>
        <div className="foot-note">
          <div className="brandline">One sky, one shirt, one night.</div>
          Star positions computed for the exact moment &amp; coordinates you choose, using the
          astronomy-engine ephemeris and the HYG star catalogue (via d3-celestial); places from
          GeoNames. Printed on Bella+Canvas 3001 with water-based DTG inks and fulfilled through
          the Prodigi print network — produced at the lab nearest your door.
        </div>
      </div>
      <div className="wrap">
        <div className="demo-note">
          DEMO STORE · payments run in Stripe test mode (no real charges) · orders are fulfilled
          through the Prodigi sandbox (no real shirts are printed) · printed inks shown in mockups
          are illustrative
        </div>
      </div>
    </footer>
  )
}
