import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap order-page">
      <div className="order-card">
        <p className="mono">Error 404</p>
        <h1 style={{ marginTop: 12, fontSize: '2.1rem' }}>No such specimen in this herbarium.</h1>
        <p className="summary-muted">The sheet you were looking for is not in the cabinet.</p>
        <div className="btn-row">
          <Link className="btn" href="/design">
            Collect a new one
          </Link>
        </div>
      </div>
    </div>
  );
}
