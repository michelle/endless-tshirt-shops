'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ArrowLeft } from 'lucide-react';
export default function Success() {
  const [status,setStatus] = useState<{paid:boolean;place:string;email:string}|null>(null);
  const [error,setError] = useState('');
  useEffect(()=>{ const id = new URLSearchParams(window.location.search).get('session_id'); if(!id){setError('No order reference was provided.');return;} fetch(`/api/status?session_id=${encodeURIComponent(id)}`).then(r=>r.json()).then(d=>{if(d.error)setError(d.error);else setStatus(d)}).catch(()=>setError('We could not load your order.'));},[]);
  return <div className="success-page"><Link className="brand" href="/"><span className="brand-mark">✳</span> sonder<span className="brand-light">studio</span><span className="brand-dot">.</span></Link><div className="success-card"><div className="success-icon"><Check size={36}/></div><div className="section-kicker">YOUR MOMENT IS ON ITS WAY</div><h1>{status?.paid ? 'You made it yours.' : error ? 'Order unavailable.' : 'Checking your order…'}</h1><p>{status?.paid ? `Thank you for your order. Your ${status.place} moment map is being prepared for printing. A payment receipt will be sent to ${status.email || 'your email'}.` : error || 'Confirming your payment details now.'}</p><Link href="/"><ArrowLeft size={17}/> Back to the studio</Link></div></div>;
}
