import Link from 'next/link';

import { publishableKey } from '@/lib/stripe';

/** True for any non-live Stripe key, so a demo deployment says so plainly. */
function isTestMode(): boolean {
  const key = publishableKey();
  return !key || !key.startsWith('pk_live_');
}

export default function SiteHeader() {
  return (
    <header className="mx-auto w-full max-w-6xl px-5 pt-10 pb-8 sm:px-8 sm:pt-14">
      {isTestMode() && (
        <div className="mb-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            Test mode — payments use Stripe test cards and print jobs are sandboxed
          </p>
        </div>
      )}

      <Link href="/" className="inline-block">
        <h1 className="text-4xl font-light tracking-tight text-slate-900 sm:text-5xl">
          datetime<span className="text-slate-400">.</span>store
        </h1>
      </Link>
      <p className="mt-3 flex items-center gap-2 text-lg font-normal text-sky-600">
        we sell a t-shirt with the current datetime.
        <ClockGlyph />
      </p>
      <hr className="mt-8 border-slate-200" />
    </header>
  );
}

function ClockGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1.05em] w-[1.05em] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3.2 2" />
    </svg>
  );
}
