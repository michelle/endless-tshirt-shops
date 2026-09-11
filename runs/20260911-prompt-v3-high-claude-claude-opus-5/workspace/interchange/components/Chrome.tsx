import Link from "next/link";

export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <path d="M4 28 L14 28 L26 12 L36 12" stroke="#e8453c" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12 L14 12 L26 28 L36 28" stroke="#38b6e0" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="6.2" fill="#0c0d11" stroke="#f4f1e9" strokeWidth="3.4" />
    </svg>
  );
}

export function Nav() {
  return (
    <div className="wrap">
      <nav className="nav">
        <Link className="brand" href="/">
          <Mark />
          <span className="brand-name">INTERCHANGE</span>
        </Link>
        <div className="nav-links">
          <Link href="/#how">How it works</Link>
          <Link href="/#faq">FAQ</Link>
          <Link className="btn sm" href="/design">Design yours</Link>
        </div>
      </nav>
    </div>
  );
}

export function Foot() {
  return (
    <footer className="site">
      <div className="wrap row">
        <div>
          INTERCHANGE &middot; One-of-one transit maps, printed direct to garment.
        </div>
        <div>Gildan 64000 Softstyle &middot; 100% cotton &middot; Printed &amp; shipped worldwide</div>
      </div>
    </footer>
  );
}
