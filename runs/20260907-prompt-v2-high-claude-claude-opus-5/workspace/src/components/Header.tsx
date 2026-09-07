'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';

export default function Header() {
  const { count, ready } = useCart();
  return (
    <header className="site-head">
      <div className="wrap site-head-in">
        <Link href="/" className="brand">
          <span className="brand-mark">Last Shift</span>
          <span className="brand-sub">Est. 2026</span>
        </Link>
        <nav className="nav">
          <Link href="/#shirts">The Register</Link>
          <Link href="/about">Why</Link>
          <Link href="/cart" className="cart-pill">
            Cart{ready && count > 0 ? <> <span className="n">({count})</span></> : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}
