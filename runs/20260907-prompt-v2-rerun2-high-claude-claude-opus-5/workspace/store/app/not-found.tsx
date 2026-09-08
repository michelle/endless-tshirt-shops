import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap narrow center" style={{ padding: "80px 20px" }}>
      <div className="rule-orn caps">Plate not found</div>
      <h1 className="title" style={{ marginTop: 14 }}>No saint by that name.</h1>
      <p className="muted">Not every disaster has been canonised yet.</p>
      <Link className="btn ghost" href="/">Back to the saints</Link>
    </div>
  );
}
