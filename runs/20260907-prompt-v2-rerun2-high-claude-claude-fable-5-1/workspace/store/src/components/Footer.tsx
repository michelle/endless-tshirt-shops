import Link from "next/link";
import { isProdigiSandbox } from "@/lib/prodigi";

export function Footer() {
  const sandbox = isProdigiSandbox();
  return (
    <footer className="mt-20 border-t-4 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <p className="font-slab text-xl">Department of Obsolete Futures</p>
          <p className="mt-2 text-ink-2">Official apparel for the futures that never arrived. Printed to order, shipped worldwide.</p>
        </div>
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-widest">Forms &amp; filings</p>
          <p><Link className="hover:underline" href="/#collection">All shirts</Link></p>
          <p><Link className="hover:underline" href="/about">About &amp; sizing</Link></p>
          <p><Link className="hover:underline" href="/order">Track an order</Link></p>
        </div>
        <div className="space-y-1 text-ink-2">
          <p className="font-bold uppercase tracking-widest text-ink">Notices</p>
          <p>Unisex Bella+Canvas 3001, 100% ring-spun cotton. Printed by Prodigi.</p>
          {sandbox ? (
            <p className="text-stamp font-bold">Test mode: payments use Stripe test cards and print orders go to the Prodigi sandbox. Nothing ships.</p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
