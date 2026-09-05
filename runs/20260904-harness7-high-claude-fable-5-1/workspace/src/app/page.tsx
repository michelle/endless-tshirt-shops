import Shop from "@/components/Shop";
import { shipCountries } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  return (
    <main className="page">
      <header className="masthead">
        <h1>datetime.store</h1>
        <h2>
          we sell a t-shirt with the current datetime.{" "}
          <span aria-hidden="true" className="masthead-clock">
            <ClockIcon />
          </span>
        </h2>
      </header>
      <Shop publishableKey={publishableKey} shipCountries={shipCountries()} />
      <footer className="footer">
        <p>
          Every shirt is one of a kind: the number is the Unix time, in milliseconds, at the instant you clicked buy.
          Printed on demand on a black 100% cotton tee and shipped free.
        </p>
        <p className="footer-meta">
          <a href="https://github.com/michelle/datetime.store" rel="noreferrer" target="_blank">
            inspired by the original
          </a>
          {" · "}
          <a href="/api/health">status</a>
        </p>
      </footer>
    </main>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
