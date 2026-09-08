import Link from 'next/link';

export default function CancelPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <h1 className="font-display text-3xl mb-4">Checkout canceled</h1>
      <p className="text-neutral-400">
        No charge was made. Your design is still there if you want to pick up
        where you left off.
      </p>
      <Link
        href="/customize"
        className="inline-block mt-8 px-6 py-3 rounded-lg bg-seed-500 hover:bg-seed-400 transition font-medium"
      >
        Back to designer
      </Link>
    </div>
  );
}
