import Link from "next/link";

export default function SuccessPage() {
  return <main className="success"><p className="eyebrow">ARCHIVE RECEIVED</p><h1>Your relic is<br/><i>being prepared.</i></h1><p>Payment received. Your one-of-one Future Fossil Club tee is now queued for print and standard US delivery. Your Stripe receipt is on its way.</p><Link href="/">Create another relic →</Link></main>;
}
