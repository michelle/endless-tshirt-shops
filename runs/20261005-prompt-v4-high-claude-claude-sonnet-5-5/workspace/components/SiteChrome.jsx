import Link from 'next/link';

export function Nav() {
  return (
    <header className="wrap nav">
      <Link href="/" className="logo">Sky<span>print</span></Link>
      <Link href="/#design" className="cta-sm">Design yours</Link>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="wrap">
      <span>© {new Date().getFullYear()} Skyprint. Printed on demand, one at a time.</span>
      <span><Link href="/policies">Shipping, returns &amp; privacy</Link></span>
    </footer>
  );
}
