export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="font-display text-lg font-bold tracking-tight">
        datetime<span className="text-stamp">.</span>store
      </div>
      <h1 className="font-display text-2xl font-bold">404: that time has passed.</h1>
      <p className="text-ink/60">
        This page doesn&apos;t exist, which — statistically — is true of
        almost every possible page at almost every possible moment.
      </p>
      <a
        href="/"
        className="rounded-lg border border-ink/20 px-5 py-2.5 text-sm font-semibold hover:border-ink/50"
      >
        Back to now
      </a>
    </main>
  );
}
