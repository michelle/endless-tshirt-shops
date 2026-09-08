import Link from "next/link";

export function NavBar() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-[#050814]/80 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-wide text-lg">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-200 shadow-[0_0_12px_3px_rgba(253,246,227,0.6)]" />
          SKYPRINT
        </Link>
        <nav className="flex items-center gap-6 text-sm text-white/70">
          <Link href="/#how-it-works" className="hover:text-white transition-colors hidden sm:inline">
            How it works
          </Link>
          <Link
            href="/design"
            className="rounded-full bg-white text-[#050814] px-4 py-2 font-medium hover:bg-amber-100 transition-colors"
          >
            Design your sky
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-10 text-sm text-white/50 flex flex-col sm:flex-row justify-between gap-4">
        <p>© {new Date().getFullYear()} Skyprint. Printed to order, one shirt at a time.</p>
        <p>DTG printed &amp; shipped by Prodigi · Payments by Stripe</p>
      </div>
    </footer>
  );
}
