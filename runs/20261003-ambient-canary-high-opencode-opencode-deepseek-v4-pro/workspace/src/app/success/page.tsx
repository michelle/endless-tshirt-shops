import Link from "next/link";

export default function Success() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl">🎉</div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Order confirmed!</h1>
      <p className="mt-3 text-lg text-stone-600">
        Thanks for your order. Your custom pet portrait is headed to the print
        lab and will be on its way to you shortly.
      </p>
      <p className="mt-2 text-sm text-stone-400">
        You&apos;ll receive a confirmation email with tracking once it ships.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white transition hover:bg-stone-700"
      >
        Design another
      </Link>
    </main>
  );
}
