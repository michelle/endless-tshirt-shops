import Store from "@/components/Store";

function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="container">
      <header className="page-header">
        <h1>datetime.store</h1>
        <h2>
          we sell a t-shirt with the current datetime. <ClockIcon />
        </h2>
      </header>
      <Store />
      <footer className="footer">
        A rebuild of{" "}
        <a href="https://github.com/michelle/datetime.store">datetime.store</a>.
        Payments are in Stripe test mode; fulfillment runs against the Prodigi
        sandbox — no real cards are charged and no shirts are printed. Use test
        card 4242&nbsp;4242&nbsp;4242&nbsp;4242.
      </footer>
    </main>
  );
}
