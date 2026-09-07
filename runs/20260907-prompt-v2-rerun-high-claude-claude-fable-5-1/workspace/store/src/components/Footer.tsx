import Link from "next/link";
import { STORE_NAME } from "@/lib/catalog";

export function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>{STORE_NAME}</strong> · Printed on demand and shipped worldwide by Prodigi. Nothing is kept in stock, which is the only way we know how to run a park.
      </div>
      <div className="footer-links">
        <Link href="/about">About the parks</Link>
        <Link href="/about#sizing">Sizing &amp; care</Link>
        <Link href="/about#shipping">Shipping &amp; returns</Link>
      </div>
      <div className="footer-fine">© {new Date().getFullYear()} {STORE_NAME}. Not affiliated with any actual park service, living or deprecated.</div>
    </footer>
  );
}
