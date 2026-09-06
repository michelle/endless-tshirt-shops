'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, Check, Clock3, Download, RefreshCw } from 'lucide-react';
import { Logo } from '../store';
import { PRODUCTS, type ShirtStyle } from '@/lib/catalog';
type Order = { paid: boolean; fulfillment: string; testMode: boolean; timestamp: number; style: ShirtStyle; size: string; amount: number; orderId: string | null; stage: string | null; artworkUrl: string | null };
export default function Confirmation() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (!sessionId) throw new Error('This page needs your checkout confirmation link.');
      const r = await fetch(`/api/orders/status?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
      const data = await r.json(); if (!r.ok) throw new Error(data.error); setOrder(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load your order. Please try again.'); }
    finally { setLoading(false); }
  }, [sessionId]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!order || !['processing', 'unpaid'].includes(order.fulfillment)) return; const timer = setTimeout(() => void refresh(), 8000); return () => clearTimeout(timer); }, [order, refresh]);
  return <><div className="announcement"><span>A MOMENT OF SILENCE FOR THE MOMENT YOU JUST BOUGHT.</span></div><header className="site-header"><Logo /><a className="text-link" href="/">Back to the store <ArrowUpRight size={15} /></a></header><main className="success-shell">
    <div className="success-badge">{order?.paid ? <Check size={30} /> : <Clock3 size={30} />}</div>
    <div className="eyebrow">{order?.testMode ? 'TEST ORDER / REAL COMMITMENT TO THE BIT' : 'YOUR LITTLE PIECE OF RIGHT NOW'}</div>
    <h1>{order?.paid ? <>Time. Captured.</> : loading ? <>One moment…</> : <>Let’s find<br />your moment.</>}</h1>
    <p>{order?.paid ? 'You did it. You bought a specific millisecond on a t-shirt. We respect the commitment.' : 'Payment and print status are checked securely with the store.'}</p>
    {error && <div className="error-notice" role="alert">{error}</div>}
    {order && <><div className="receipt"><span className="eyebrow">THIS ONE IS YOURS</span><div className="receipt-timestamp">{order.timestamp}</div><div className="receipt-date">{new Date(order.timestamp).toISOString().replace('T', ' ').replace('Z', ' UTC')}</div><dl><dt>The datetime tee</dt><dd>{PRODUCTS[order.style]?.name} / {order.size}</dd><dt>Color</dt><dd>Black, obviously</dd><dt>Shipping</dt><dd>Free · United States</dd><dt>{order.testMode ? 'Test total' : 'Total paid'}</dt><dd>${(order.amount / 100).toFixed(2)} USD</dd></dl></div><div className="status-card" role="status"><strong>{order.fulfillment === 'submitted' ? 'Your moment is with the printer.' : order.fulfillment === 'attention' ? 'Payment confirmed. Your print needs a check.' : order.paid ? 'Payment confirmed. Sending your shirt to print…' : 'Payment is not complete yet.'}</strong><br />{order.testMode ? 'This is a sandbox order. No real charge was made and no physical shirt will be produced.' : 'Your order is made to order. Save this page to check its progress.'}{order.fulfillment === 'processing' && <><br />The print service is taking a moment. We’ll retry automatically. You do not need to pay again.</>}{order.fulfillment === 'attention' && <><br />The print provider reported an issue. The store operator can review it using the order reference below.</>}{order.orderId && <><br /><span className="small">Prodigi status: {order.stage}</span></>}</div></>}
    <div className="success-actions"><a href="/" className="checkout-button">Get another moment <ArrowUpRight size={19} /></a><button onClick={() => void refresh()} className="outline-button" disabled={loading}><RefreshCw size={15} />{loading ? 'Checking…' : 'Refresh status'}</button>{order?.artworkUrl && <a href={order.artworkUrl} download={`datetime-${order.timestamp}.png`} className="outline-button"><Download size={15} /> Print artwork</a>}</div>
    {order?.orderId && <p className="order-ref">PRINT REFERENCE: {order.orderId}</p>}
    <p className="success-footer">Save this confirmation link to revisit your order. Keep it private; it grants access to your order status and artwork.</p>
  </main></>;
}
