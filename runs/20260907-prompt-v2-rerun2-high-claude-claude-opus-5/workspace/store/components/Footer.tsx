import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="wrap cols">
        <div style={{ maxWidth: 330 }}>
          <div className="caps" style={{ marginBottom: 8 }}>The Order of Small Disasters</div>
          <p style={{ margin: 0 }}>
            Eight icons for the catastrophes that never make the news. Printed to order on
            Gildan 64000 softstyle cotton and shipped from the press nearest you.
          </p>
        </div>
        <div>
          <div className="caps" style={{ marginBottom: 8 }}>Shop</div>
          <div><Link href="/">All saints</Link></div>
          <div><Link href="/cart">Cart</Link></div>
          <div><Link href="/about">About the Order</Link></div>
        </div>
        <div>
          <div className="caps" style={{ marginBottom: 8 }}>Fine print</div>
          <div><Link href="/legal">Shipping &amp; returns</Link></div>
          <div><Link href="/legal#privacy">Privacy</Link></div>
        </div>
      </div>
    </footer>
  );
}
