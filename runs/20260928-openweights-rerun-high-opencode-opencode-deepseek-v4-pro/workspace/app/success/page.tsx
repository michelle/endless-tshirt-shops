import Link from 'next/link';

export default function SuccessPage() {
  return (
    <main className="starfield flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl text-gold">☾</div>
      <h1 className="mt-6 text-5xl text-cream">Thank you.</h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-cream/70">
        Your payment went through and your one-of-a-kind moon tee is now being
        printed on demand. We&apos;ll ship it to you as soon as it&apos;s ready.
      </p>
      <p className="mt-2 text-sm text-cream/50">
        A confirmation email is on its way.
      </p>
      <Link
        href="/"
        className="mt-10 rounded-full border border-gold/60 px-8 py-3 text-gold transition hover:bg-gold hover:text-night"
      >
        Back to Lunaria
      </Link>
    </main>
  );
}
