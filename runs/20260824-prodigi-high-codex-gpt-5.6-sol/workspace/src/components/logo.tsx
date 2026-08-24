import Link from "next/link";

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="datetime.store home">
      <span className="logo-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      datetime<span>.</span>store
    </Link>
  );
}
