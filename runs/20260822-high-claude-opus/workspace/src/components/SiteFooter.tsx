export default function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-5 pb-12 sm:px-8">
      <hr className="mb-6 border-slate-200" />
      <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          One shirt, one moment. Printed and shipped in the US, usually within four
          business days.
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Payments by Stripe</span>
          <span aria-hidden="true" className="hidden sm:inline text-slate-300">
            ·
          </span>
          <span>Printing by Scalable Press</span>
        </p>
      </div>
    </footer>
  );
}
