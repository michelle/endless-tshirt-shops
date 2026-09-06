import Link from "next/link";

export default function CheckoutErrorPage() {
  return <main className="status-page"><Link className="brand" href="/">STATUS<span>/</span>WEAR</Link><div className="status-panel"><span className="status-code">503</span><p className="eyebrow">[ CHECKOUT UNAVAILABLE ]</p><h1>THE PAYMENT SERVICE MISSED A BEAT.</h1><p>No charge was made. Head back to the drop and try the request again.</p><Link className="back-link" href="/#shop">← TRY AGAIN</Link></div></main>;
}
