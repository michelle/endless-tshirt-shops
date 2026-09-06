import Link from "next/link";
import { LiveClock } from "./components/LiveClock";

export default function NotFound() {
  return (
    <main className="page narrow">
      <header className="page-header">
        <h1>
          <Link href="/">datetime.store</Link>
        </h1>
        <h2>404. this page does not exist yet. or anymore. time is like that.</h2>
      </header>
      <p className="muted">
        It is currently <LiveClock className="num" />, and there is nothing here.
      </p>
      <p>
        <Link className="button-link" href="/">
          ← Back to the shirt
        </Link>
      </p>
    </main>
  );
}
