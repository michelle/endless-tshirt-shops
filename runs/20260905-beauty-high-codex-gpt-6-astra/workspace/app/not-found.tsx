import { Clock3, ArrowUpRight } from "lucide-react";
export default function NotFound() {
  return (
    <main className="success-page">
      <a className="wordmark" href="/">
        datetime.store
      </a>
      <div className="success-icon">
        <Clock3 size={40} strokeWidth={1.3} />
      </div>
      <p className="eyebrow">404 / A MOMENT OUT OF PLACE</p>
      <h1>
        Wrong time.
        <br />
        <em>Right little shop.</em>
      </h1>
      <p className="dialog-description">
        This page seems to have slipped through time. The present is just one
        click away.
      </p>
      <a className="capture-button" href="/">
        Back to right now <ArrowUpRight size={19} />
      </a>
    </main>
  );
}
