"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { useCart } from "@/lib/cart";
import { STORE_NAME } from "@/lib/catalog";

export function Header({ sandbox }: { sandbox: boolean }) {
  const { count, ready } = useCart();
  const path = usePathname();
  const link = (href: string, label: string) => (
    <Link href={href} className={path === href || (href !== "/" && path.startsWith(href)) ? "nav-link active" : "nav-link"}>
      {label}
    </Link>
  );
  return (
    <>
      {sandbox && (
        <div className="banner" role="status">
          Test mode: no payment is taken and orders go to the Prodigi sandbox, so nothing is printed or shipped.
        </div>
      )}
      <header className="header">
        <Link href="/" className="brand" aria-label={`${STORE_NAME} home`}>
          <Logo size={42} />
          <span className="brand-text">
            <span className="brand-name">{STORE_NAME}</span>
            <span className="brand-sub">Official Park Service Tees</span>
          </span>
        </Link>
        <nav className="nav">
          {link("/", "Parks")}
          {link("/about", "About")}
          <Link href="/cart" className={path === "/cart" ? "nav-link cart-link active" : "nav-link cart-link"}>
            Cart
            <span className="cart-count" aria-label={`${count} items in cart`}>
              {ready ? count : ""}
            </span>
          </Link>
        </nav>
      </header>
    </>
  );
}
