import Link from 'next/link';
import { Clock3, ArrowUpRight } from 'lucide-react';
export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="datetime.store home">
        <Clock3 strokeWidth={1.6} />
        <span>datetime.store</span>
      </Link>
      <div className="header-right">
        <span className="status mono">
          <span className="dot" />
          Every millisecond counts
        </span>
        <Link href="/#the-details">
          The details <ArrowUpRight size={13} style={{ display: 'inline' }} />
        </Link>
      </div>
    </header>
  );
}
export function Footer({
  onPrivacy,
  onTerms,
}: {
  onPrivacy?: () => void;
  onTerms?: () => void;
}) {
  return (
    <footer className="footer">
      <span>
        datetime.store <span aria-hidden="true">©</span> 2026 · Made for right
        now.
      </span>
      <div className="footer-links">
        {onPrivacy && (
          <button className="text-button" onClick={onPrivacy}>
            Privacy
          </button>
        )}
        {onTerms && (
          <button className="text-button" onClick={onTerms}>
            Terms
          </button>
        )}
        <a
          href="https://github.com/michelle/datetime.store"
          target="_blank"
          rel="noreferrer"
        >
          The original idea ↗
        </a>
      </div>
    </footer>
  );
}
