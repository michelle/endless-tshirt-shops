import Link from "next/link";

export default function Success() {
  return <main className="status-page"><div className="status-card"><p className="eyebrow">PAYMENT RECEIVED</p><h1>You bought<br /><em>a moment.</em></h1><p>Your timestamp has been sent to the t-shirt dimension. Stripe will email your receipt; a very ordinary mail carrier will do the rest.</p><Link className="return" href="/">buy another moment →</Link></div></main>;
}
