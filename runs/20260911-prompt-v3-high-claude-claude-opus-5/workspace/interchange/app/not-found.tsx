import Link from "next/link";
import { Foot, Nav } from "@/components/Chrome";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="wrap" style={{ padding: "90px 0 40px" }}>
        <p className="eyebrow">404</p>
        <h1 style={{ maxWidth: "14ch" }}>This service does not stop here.</h1>
        <p className="lede" style={{ marginTop: 20 }}>
          The page you were looking for is not on the network. Try the designer instead.
        </p>
        <p style={{ marginTop: 26 }}>
          <Link className="btn accent" href="/design">Design your map</Link>
        </p>
      </main>
      <Foot />
    </>
  );
}
