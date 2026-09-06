import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="font-mono text-neutral-500 text-sm tracking-widest">HTTP/1.1 499 CLIENT CLOSED REQUEST</p>
      <h1 className="font-mono text-4xl font-extrabold mt-3">Checkout canceled.</h1>
      <p className="mt-4 text-neutral-400">No charge was made. Your cart is exactly where you left it.</p>
      <Link href="/#shop" className="font-mono text-emerald-400 mt-8 inline-block">
        ← Back to shop
      </Link>
    </div>
  );
}
