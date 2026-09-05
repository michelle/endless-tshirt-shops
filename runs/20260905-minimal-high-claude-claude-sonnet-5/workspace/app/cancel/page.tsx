import Link from "next/link";

export default function CancelPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="max-w-md w-full text-center">
        <h1 className="font-display text-3xl font-black mb-4">Checkout canceled</h1>
        <p className="text-neutral-400">
          No worries — that moment already passed anyway. There&apos;s always a new
          one waiting.
        </p>
        <Link
          href="/"
          className="mt-10 inline-block rounded-full border border-neutral-700 px-5 py-2.5 text-sm hover:border-neutral-500"
        >
          Back to datetime.store
        </Link>
      </div>
    </main>
  );
}
