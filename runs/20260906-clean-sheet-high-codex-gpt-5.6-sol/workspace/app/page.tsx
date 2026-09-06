import Image from "next/image";

const products = [
  { id: "200-ok", code: "200", status: "OK", name: "The Healthy Build", note: "For the rare days when everything ships clean.", color: "Black", image: "/products/200-ok.png", accent: "cyan" },
  { id: "404-offline", code: "404", status: "OFFLINE", name: "The Hard Disconnect", note: "A wearable boundary for focus mode.", color: "Natural", image: "/products/404-offline.png", accent: "cream" },
  { id: "418-teapot", code: "418", status: "TEAPOT", name: "The Permanent Teapot", note: "An April Fools’ joke that outlived the decade.", color: "Orange", image: "/products/418-teapot.png", accent: "orange" },
] as const;

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Status Wear home">STATUS<span>/</span>WEAR</a>
        <a className="header-link" href="#shop">SHOP DROP 001 <span aria-hidden="true">↘</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-kicker"><span>PROTOCOL APPAREL</span><span>DROP 001 / 2026</span></div>
        <div className="hero-title" aria-label="Wear your status">
          <span>WEAR</span><span className="outline">YOUR</span><span>STATUS.</span>
        </div>
        <div className="hero-footer">
          <p>Quietly loud tees for people who read the response before the request.</p>
          <a className="round-link" href="#shop" aria-label="Go to the shop">↓</a>
        </div>
      </section>

      <section className="shop" id="shop">
        <div className="section-heading">
          <div><span className="eyebrow">[ AVAILABLE NOW ]</span><h1>THE STATUS SERIES</h1></div>
          <p>Three responses. One heavyweight blank. Zero explanations.</p>
        </div>

        <div className="product-grid">
          {products.map((product, index) => (
            <article className="product-card" key={product.id}>
              <div className={`product-image product-image--${product.accent}`}>
                <div className="product-index">0{index + 1}</div>
                <Image src={product.image} alt={`${product.name} ${product.color.toLowerCase()} t-shirt with ${product.code} ${product.status} print`} width={1254} height={1254} sizes="(max-width: 760px) 100vw, 33vw" priority={index === 0} />
              </div>
              <div className="product-copy">
                <div className="product-code"><span>{product.code}</span><strong>{product.status}</strong></div>
                <p>{product.note}</p>
              </div>
              <form action="/api/checkout" method="post" className="buy-form">
                <input type="hidden" name="productId" value={product.id} />
                <label><span>SIZE</span><select name="size" defaultValue="m" aria-label={`Size for ${product.name}`}><option value="s">S</option><option value="m">M</option><option value="l">L</option><option value="xl">XL</option><option value="2xl">2XL</option><option value="3xl">3XL</option></select></label>
                <button type="submit"><span>BUY — $32</span><span aria-hidden="true">↗</span></button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="manifesto" aria-label="Product details">
        <p className="manifesto-mark">S/W</p>
        <div className="manifesto-copy">
          <h2>BUILT FOR UPTIME.<br />COMFORTABLE IN FAILURE.</h2>
          <div className="specs"><span>HEAVY COTTON</span><span>UNISEX FIT</span><span>PRINTED ON DEMAND</span><span>GLOBAL FULFILMENT</span></div>
        </div>
      </section>

      <footer>
        <a className="brand brand--footer" href="#top">STATUS<span>/</span>WEAR</a>
        <div><p>PAYMENTS BY STRIPE</p><p>PRINTED BY PRODIGI</p></div>
        <p className="test-note">TEST STORE / NO LIVE CHARGES</p>
      </footer>
    </main>
  );
}
