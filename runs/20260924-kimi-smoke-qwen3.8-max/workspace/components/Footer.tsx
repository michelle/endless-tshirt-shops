import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-cols">
        <div>
          <div className="brand-name">Lay of the Land</div>
          <p className="tiny" style={{ maxWidth: '24em', marginTop: 8 }}>
            Custom topographic portraits of the places that shaped you, generated from open
            elevation data and printed on demand with direct-to-garment ink. One of one, made
            when you order it.
          </p>
          <p className="tiny" style={{ marginTop: 10 }}>
            Terrain data: AWS Terrain Tiles (Mapzen/Nextzen) · Geocoding: Open-Meteo · Printing:
            Prodigi
          </p>
        </div>
        <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Shop</div>
            <div style={{ display: 'grid', gap: 6 }}>
              <Link href="/design">Design studio</Link>
              <a href="/#gallery">Gallery</a>
              <a href="/#tee">The tee &amp; sizes</a>
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Help</div>
            <div style={{ display: 'grid', gap: 6 }}>
              <a href="/#faq">FAQ</a>
              <a href="/#faq">Shipping &amp; returns</a>
              <a href="mailto:hello@layofthe.land">hello@layofthe.land</a>
            </div>
          </div>
        </div>
      </div>
      <div className="container" style={{ marginTop: 36 }}>
        <p className="tiny">
          © {new Date().getFullYear()} Lay of the Land. A demonstration store — sandbox payments,
          sandbox printing.
        </p>
      </div>
    </footer>
  );
}
