import Link from 'next/link';

/** Masthead and footer, shared by the store and the confirmation page. */
export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-9 border-b border-[var(--color-hairline)] pb-6 sm:mb-12">
        <Link href="/" className="inline-block no-underline">
          <h1 className="text-3xl leading-none font-normal tracking-tight sm:text-[42px]">
            datetime<span className="text-[var(--color-muted)]">.store</span>
          </h1>
        </Link>
        <p className="mt-2.5 text-[15px] text-[var(--color-accent)] sm:text-base">
          we sell a t-shirt with the current datetime.{' '}
          <span aria-hidden className="align-[-1px]">
            ⏱
          </span>
        </p>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-[var(--color-hairline)] pt-5 text-xs text-[var(--color-muted)]">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p>
            Printed to order in the US · Payments by Stripe · Fulfilment by Scalable Press
          </p>
          <p>
            <Link href="/" className="underline decoration-[var(--color-hairline)] hover:text-[var(--color-ink)]">
              start over
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
