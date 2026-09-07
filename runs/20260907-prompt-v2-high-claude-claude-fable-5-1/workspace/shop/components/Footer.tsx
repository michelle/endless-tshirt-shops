import Link from "next/link";
import { isProdigiSandbox } from "@/lib/prodigi";

export function Footer() {
  const sandbox = isProdigiSandbox();
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY);
  return (
    <footer className="mt-20 border-t border-ink/15 bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <div className="font-display text-lg">The Obsolete Guild</div>
          <p className="mt-2 max-w-xs text-sm text-paper/70">Union-badge tees for the trades that automation, electricity and the alarm clock put out of work.</p>
        </div>
        <div className="text-sm">
          <div className="font-mono text-xs uppercase tracking-widest text-paper/50">Shop</div>
          <ul className="mt-2 space-y-1">
            <li><Link href="/#shirts" className="hover:underline">All shirts</Link></li>
            <li><Link href="/about" className="hover:underline">About the guild</Link></li>
            <li><Link href="/orders" className="hover:underline">Track an order</Link></li>
            <li><Link href="/about#shipping" className="hover:underline">Shipping &amp; returns</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="font-mono text-xs uppercase tracking-widest text-paper/50">Fulfilment</div>
          <p className="mt-2 text-paper/70">Printed to order on Bella + Canvas 3001 tees and shipped worldwide from the nearest print lab via Prodigi.</p>
          {(sandbox || !stripe) && (
            <p className="mt-3 rounded border border-amber-400/50 bg-amber-400/10 p-2 text-xs text-amber-200">
              Test mode: {sandbox ? "orders go to the Prodigi sandbox and are not printed" : "orders are live"}; {stripe ? "payments via Stripe" : "no real payment is taken"}.
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
