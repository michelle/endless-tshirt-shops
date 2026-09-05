import Link from "next/link";

export default function Header() {
  return (
    <div className="page-header">
      <h1>
        <Link href="/">datetime.store</Link>
      </h1>
      <h2>
        we sell a t-shirt with the current datetime.
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </h2>
    </div>
  );
}
