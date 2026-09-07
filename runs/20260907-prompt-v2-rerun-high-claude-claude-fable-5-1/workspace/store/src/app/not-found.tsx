import Link from "next/link";

export default function NotFound() {
  return (
    <div className="narrow">
      <div className="eyebrow">Error 404</div>
      <h1>This trail has been decommissioned.</h1>
      <p className="muted">The page you asked for was deprecated, removed, or never existed.</p>
      <Link href="/" className="btn primary">
        Back to the parks
      </Link>
    </div>
  );
}
