import Link from 'next/link';
import { Check, ArrowLeft, Sparkles } from 'lucide-react';
import { stripeClient } from '@/lib/stripe';
export const dynamic = 'force-dynamic';
export default async function Success({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let paid=false, orderId='';
  if (session_id && /^cs_(test_)?[A-Za-z0-9]+$/.test(session_id)) {
    try { const session=await stripeClient().checkout.sessions.retrieve(session_id); paid=session.payment_status==='paid'; orderId=session.metadata?.prodigi_order_id || ''; } catch {}
  }
  return <main className="success-page"><div className="success-card"><span className="success-symbol">{paid?<Check size={34}/>:<Sparkles size={34}/>}</span><span className="section-kicker">OUR ORBIT · YOUR STORY</span><h1>{paid?'Payment received.':'Your order is processing.'}</h1><p>{paid?'Payment received. Your custom print file is now being prepared and your shirt will be submitted for production.':'We could not confirm payment yet. If you completed checkout, refresh this page in a moment or check your payment receipt.'}</p>{paid&&<div className="success-detail"><span>PAYMENT</span><strong>CONFIRMED</strong><span>FULFILLMENT</span><strong>{orderId?`SUBMITTED · ${orderId}`:'PROCESSING'}</strong></div>}<Link href="/"><ArrowLeft size={17}/> BACK TO THE STORE</Link></div></main>;
}
