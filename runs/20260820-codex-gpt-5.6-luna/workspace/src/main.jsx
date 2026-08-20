import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const pad = n => String(n).padStart(2,'0');
const stamp = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,'0')}`;

function Shirt({style, time}) {
  const path = style === 'fitted' ? 'M79 15c-2-2-16-6-16-6s-4 9-12 9S40 9 40 9s-15 5-16 6L10 32l10 8 7-6s14 24 1 59c0 0 44 11 48 0-10-43 1-59 1-59l6 5 10-11C92 29 81 17 79 15Z' : 'M79 6c-2-2-16-2-16-2S53 18 51 18 40 4 40 4s-15 1-17 2L1 31l15 12 10-8 1 59s44 11 48 0l1-59 9 8 15-12S81 8 79 6Z';
  return <div className="shirt-wrap"><svg viewBox="0 0 100 125" aria-label="Black datetime t-shirt"><path d={path}/></svg><div className="shirt-print">{time}</div><div className="shirt-price"><s>$30.00</s> <b>$22.50</b></div></div>;
}

function App() {
  const [style,setStyle] = useState('fitted'); const [size,setSize] = useState('M'); const [now,setNow] = useState(new Date()); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const [done,setDone] = useState(() => new URLSearchParams(location.search).get('success') === '1'); const [fulfill,setFulfill] = useState('working');
  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()), 47); return ()=>clearInterval(id)},[]);
  useEffect(()=>{ const id=new URLSearchParams(location.search).get('session_id'); if(done&&id) fetch('/api/fulfill',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session_id:id})}).then(r=>r.ok?setFulfill('done'):setFulfill('error')).catch(()=>setFulfill('error')); },[done]);
  const current = useMemo(()=>stamp(now),[now]);
  async function checkout(){ setBusy(true); setError(''); try { const r=await fetch('/api/create-checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({style,size,timestamp:current})}); const p=await r.json(); if(!r.ok) throw Error(p.error||'Checkout could not be started'); location.href=p.url; } catch(e){setError(e.message);setBusy(false)} }
  if(done) return <main className="shell success"><div className="eyebrow">datetime.store / order received</div><h1>Nice. Your shirt is<br/><em>in the works.</em></h1><p>{fulfill==='error'?'Your payment went through. We’ll retry the print handoff shortly and email you if we need anything.':fulfill==='working'?'Payment received. Sending your timestamp to our print partner…':'We’ve sent your order to our print partner. Your confirmation and tracking details will arrive by email.'}</p><button onClick={()=>{history.replaceState({},'',location.pathname);setDone(false)}}>Get another shirt <span>↗</span></button></main>;
  return <main className="shell"><header><div className="brand">datetime<span>.</span>store</div><div className="badge">a live artifact <i>●</i></div></header><section className="intro"><div><div className="eyebrow">A T-SHIRT FOR RIGHT NOW</div><h1>The exact time,<br/><em>on a shirt.</em></h1><p className="lede">A tiny timestamp from this precise moment, printed in ink and made physical. Yours will keep ticking until checkout.</p></div><div className="meta">edition 001<br/>ships worldwide<br/>printed to order</div></section><section className="product"><div className="stage"><Shirt style={style} time={current}/><div className="stage-note">your timestamp, live <span>↗</span></div></div><aside className="controls"><div className="section-label">01 / silhouette</div><div className="choices">{[['fitted','Fitted'],['unisex','Unisex']].map(([v,l])=><button key={v} className={style===v?'choice active':'choice'} onClick={()=>setStyle(v)}>{l}<small>{v==='fitted'?'shaped / women':'relaxed / everyone'}</small></button>)}</div><div className="section-label second">02 / size</div><div className="sizes">{['S','M','L','XL'].map(v=><button key={v} className={size===v?'size active':'size'} onClick={()=>setSize(v)}>{v}</button>)}</div><div className="purchase"><div><strong>$22.50</strong><span>USD · free shipping</span></div><button className="buy" disabled={busy} onClick={checkout}>{busy?'Opening checkout…':'Make it mine'} <span>↗</span></button>{error&&<p className="error">{error}</p>}</div><p className="fine">Secure payment via Stripe. Printed and shipped by Scalable Press.<br/>One shirt, made just for this moment.</p></aside></section><footer><span>datetime.store © 2026</span><span>no stock · no waste · no two alike</span></footer></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
