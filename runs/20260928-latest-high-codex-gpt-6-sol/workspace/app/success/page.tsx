'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export default function Success() {
 const [status,setStatus]=useState('checking'); const [number,setNumber]=useState('');
 useEffect(()=>{ const id=new URLSearchParams(location.search).get('session_id'); if(!id){setStatus('unavailable');return;} fetch(`/api/order?session_id=${encodeURIComponent(id)}`).then(r=>r.json()).then(x=>{setStatus(x.status);setNumber(x.number||'')}).catch(()=>setStatus('unavailable')); },[]);
 return <main className="success"><Link href="/" className="brand">NIGHTMARK<span>✳</span></Link><div className="successCard"><div className="successIcon">✳</div><p className="eyebrow">A moment made yours</p><h1>{status==='paid'?'Your story is on its way.':status==='checking'?'Checking your payment…':'We’re checking your order.'}</h1><p>{status==='paid'?'Payment confirmed. Your one-of-one tee is being prepared for print. Save the order reference below for your records.':'If you completed payment, your order will be processed after it is confirmed. Please contact us if you need help.'}</p>{number&&<div className="orderNumber">ORDER REFERENCE · {number}</div>}<Link href="/" className="primaryButton">Back to Nightmark <span>↗</span></Link></div></main>;
}
