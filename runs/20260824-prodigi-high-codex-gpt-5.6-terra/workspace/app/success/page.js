import Link from 'next/link';
import Stripe from 'stripe';
import './style.css';

export const dynamic = 'force-dynamic';
export default async function Success({ searchParams }) {
  const { session_id: sessionId } = await searchParams;
  let valid = false;
  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try { valid = (await new Stripe(process.env.STRIPE_SECRET_KEY).checkout.sessions.retrieve(sessionId)).payment_status === 'paid'; } catch { valid = false; }
  }
  return <main className="success"><p className="eyebrow">{valid ? 'MOMENT CAPTURED' : 'CHECKOUT STATUS'}</p><h1>{valid ? <>Your now<br /><em>is on its way.</em></> : 'We could not confirm that order.'}</h1><p>{valid ? 'Thank you. Your order has been received and will be sent to our print partner shortly. Your receipt is on its way to your inbox.' : 'If you completed payment, please check your email receipt. Otherwise, return to the shop to try again.'}</p><Link href="/">← RETURN TO DATETIME.STORE</Link></main>;
}
