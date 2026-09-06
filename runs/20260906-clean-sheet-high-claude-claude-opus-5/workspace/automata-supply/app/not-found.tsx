export default function NotFound() {
  return (
    <div className="wrap" style={{ padding: "90px 24px 120px", maxWidth: 600 }}>
      <p className="eyebrow">404</p>
      <h1 className="hero-title" style={{ fontSize: 36 }}>
        No such rule.
      </h1>
      <p className="product-note">
        There are only 256 of them, and this is not one. Try the collection.
      </p>
      <a className="btn btn-primary" href="/">
        Back to the shop
      </a>
    </div>
  );
}
