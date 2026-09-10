import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="font-serif-display text-3xl mb-4">Checkout canceled</h1>
      <p className="text-white/60 mb-8">
        No charge was made. Your cart is still saved if you&apos;d like to finish later.
      </p>
      <div className="flex justify-center gap-4">
        <Link href="/cart" className="rounded-full border border-white/25 px-6 py-3">
          Back to Cart
        </Link>
        <Link href="/design" className="rounded-full bg-amber-300 text-black font-semibold px-6 py-3">
          Keep Designing
        </Link>
      </div>
    </div>
  );
}
