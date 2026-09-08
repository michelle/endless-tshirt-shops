'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, Check, Globe2, LockKeyhole, Minus, Plus, Sparkles } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DEFAULT_DESIGN, Design, PALETTES, designSchema, edition, previewUrl } from '@/lib/design';

export default function Store({testMode}:{testMode:boolean}) {
 const [design,setDesign] = useState<Design>(DEFAULT_DESIGN);
 const [size,setSize] = useState('m'); const [quantity,setQuantity] = useState(1);
 const [view,setView] = useState<'shirt'|'art'>('shirt');
 const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [canceled,setCanceled]=useState(false);
 const request = useRef<{fingerprint:string,id:string}|null>(null);
 useEffect(()=>{
  try { const saved=JSON.parse(localStorage.getItem('orbit-draft')||'null'); if(saved && designSchema.safeParse(saved.design).success){ setDesign(saved.design); if(['s','m','l','xl','2xl'].includes(saved.size))setSize(saved.size); if(Number.isInteger(saved.quantity)&&saved.quantity>=1&&saved.quantity<=5)setQuantity(saved.quantity); }} catch {}
  setCanceled(new URLSearchParams(location.search).get('canceled')==='1');
 },[]);
 useEffect(()=>{ const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext; if(!context)return; const lifecycle=new AbortController(); try{Promise.resolve(context.registerTool({name:'configure_personal_orbit',title:'Personalize an Orbit tee',description:'Update the visible shirt design. Does not place an order or take payment.', inputSchema:{type:'object',properties:{place:{type:'string',maxLength:24},date:{type:'string',format:'date'},dedication:{type:'string',maxLength:32},palette:{type:'string',enum:['solar','electric','aurora']}},required:['place','date','dedication','palette'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input:unknown)=>{const parsed=designSchema.parse(input);setDesign(parsed);return {configured:true,design:parsed};}},{signal:lifecycle.signal})).catch(()=>{});}catch{} return()=>lifecycle.abort();},[]);
 function update(key:keyof Design,value:string){setDesign(d=>({...d,[key]:value}));setError('');}
 async function checkout(e:React.FormEvent){ e.preventDefault(); setError('');
  const parsed=designSchema.safeParse(design);if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  setBusy(true);
  try{localStorage.setItem('orbit-draft',JSON.stringify({design,size,quantity})); const fingerprint=JSON.stringify({design:parsed.data,size,quantity}); if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
   const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({design:parsed.data,size,quantity,requestId:request.current!.id})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Checkout could not be opened. Please try again.'); location.assign(data.url);
  }catch(e){setError(e instanceof Error?e.message:'Something went wrong. Please try again.');setBusy(false);}
 }
 const lastValid=useRef<Design>(DEFAULT_DESIGN); const validPreview=designSchema.safeParse(design); if(validPreview.success)lastValid.current=validPreview.data; const visibleDesign=lastValid.current;
 return <>
  {testMode&&<div className="test-banner">TEST STORE <span>Explore freely. No real charges or shipments.</span></div>}
  <header className="header"><a className="wordmark" href="/" aria-label="Personal Orbit home"><span className="brand-symbol">✳</span> PERSONAL ORBIT<span className="trademark">®</span></a><nav><a href="#story">The idea</a><a href="#details">The tee</a><a className="nav-create" href="#customize">Make it yours <ArrowUpRight size={16}/></a></nav></header>
  <main>
   <div className="collection-line"><span>THE MOMENT COLLECTION / 001</span><span>MADE TO MEAN SOMETHING <span className="orange-dot"/></span></div>
   <section className="product" aria-label="Personalize your t-shirt">
    <div className="visual-column">
     <div className={'product-stage '+(view==='art'?'art-view':'')}>
      <div className="stage-top"><span>YOUR MOMENT, IN ORBIT.</span><span>01 / 01</span></div>
      {view==='shirt'&&<img className="shirt-photo" src="/images/black-shirt.png" alt="Black crewneck t-shirt, front view"/>}
      <img className="shirt-art" src={previewUrl(visibleDesign)} alt={`Personalized ${design.place} orbit artwork, ${design.date}, ${design.dedication}`} />
      <div className="stage-bottom"><span><i/> LIVE PERSONALIZATION</span><span>BLACK / FRONT PRINT</span></div>
     </div>
     <div className="view-controls"><button onClick={()=>setView('shirt')} aria-pressed={view==='shirt'}>On the tee</button><button onClick={()=>setView('art')} aria-pressed={view==='art'}>The artwork <ArrowUpRight size={14}/></button><span>Preview illustration. Print scale may vary.</span></div>
     <div className="edition"><span>DESIGN FINGERPRINT</span><span>PO—{edition(visibleDesign)}</span><span>YOURS TO MAKE.</span></div>
    </div>
    <div className="customizer" id="customize">
     <div className="eyebrow"><span className="orange-dot"/> ONE MOMENT. ONE OF ONE.</div>
     <h1>Some moments<br/>stay with you.<br/><em>Wear yours.</em></h1>
     <p className="intro">A first hello. A last-minute trip. The place that changed everything. Turn your moment into a personal orbit.</p>
     <div className="price-line"><span>The Personal Orbit Tee</span><strong>$38 <small>USD</small></strong></div>
     {canceled&&<p className="notice">Checkout canceled. Your design is still here; no order has been sent to print.</p>}
     <form onSubmit={checkout}>
      <div className="field-heading"><span>01</span><h2>Make it meaningful</h2><Sparkles size={16}/></div>
      <label className="field">Your place <span>A city, a street, a little corner of the world</span><input name="place" value={design.place} onChange={e=>update('place',e.target.value)} required maxLength={24} pattern="[A-Za-z0-9 .,!?&'()\-]+" autoComplete="off" /></label>
      <div className="field-row"><label className="field">Your date<input name="date" type="date" min="1900-01-01" max="2100-12-31" value={design.date} onChange={e=>update('date',e.target.value)} required /></label><label className="field dedication">Your words <span>{design.dedication.length}/32</span><input name="dedication" value={design.dedication} onChange={e=>update('dedication',e.target.value)} required maxLength={32} placeholder="A message only you understand"/></label></div>
      <p className="field-help">English letters, numbers & simple punctuation. Every detail changes the orbit.</p>
      <fieldset className="palette-field"><legend>Choose your spectrum <span>{PALETTES[design.palette].name}</span></legend><RadioGroup value={design.palette} onValueChange={v=>update('palette',v as string)} className="palette-options" aria-label="Ink color spectrum">{Object.entries(PALETTES).map(([key,p])=><label className={'palette-option '+(design.palette===key?'selected':'')} key={key}><RadioGroupItem value={key} className="option-radio"/><span className="swatch" style={{background:`linear-gradient(120deg,${p.colors.join(',')})`}}/><span>{p.name}</span>{design.palette===key&&<Check size={14}/>}</label>)}</RadioGroup></fieldset>
      <div className="field-heading second"><span>02</span><h2>Find your fit</h2><Dialog><DialogTrigger className="text-link" type="button">Size guide ↗</DialogTrigger><DialogContent className="size-dialog"><DialogTitle>Find your fit</DialogTitle><DialogDescription>Gildan 64000 · Unisex Softstyle. Measure a tee you love, laid flat. Measurements are approximate; allow ±1 inch.</DialogDescription><table><thead><tr><th>Size</th><th>Width</th><th>Length</th></tr></thead><tbody>{[['S','18″','28″'],['M','20″','29″'],['L','22″','30″'],['XL','24″','31″'],['2XL','26″','32″']].map(row=><tr key={row[0]}>{row.map((v,i)=><td key={i}>{v}</td>)}</tr>)}</tbody></table><p>Standard fit. Size up for a roomier feel. Black, 100% ring-spun cotton.</p></DialogContent></Dialog></div>
      <RadioGroup className="sizes" value={size} onValueChange={v=>setSize(v as string)} aria-label="T-shirt size">{['s','m','l','xl','2xl'].map(s=><label key={s} className={size===s?'selected':''}><RadioGroupItem className="option-radio" value={s}/>{s.toUpperCase()}</label>)}</RadioGroup>
      <div className="quantity-row"><span>Black · Unisex · Softstyle cotton</span><div className="quantity"><button type="button" aria-label="Decrease quantity" disabled={quantity===1} onClick={()=>setQuantity(q=>q-1)}><Minus size={14}/></button><output aria-label="Quantity">{quantity}</output><button type="button" aria-label="Increase quantity" disabled={quantity===5} onClick={()=>setQuantity(q=>q+1)}><Plus size={14}/></button></div></div>
      <button className="checkout-button" disabled={busy} type="submit">{busy?'Opening secure checkout…':`Make it mine — $${38*quantity}`}<ArrowRight size={20}/></button>
      {error&&<p className="error" role="alert">{error}</p>}
      <div className="checkout-note"><LockKeyhole size={13}/><span>Secure checkout with Stripe · $6 US shipping per order</span></div>
      <p className="checkout-total">Total ${38*quantity+6} USD{testMode?'':' before tax'}. Review your spelling before checkout.</p>
     </form>
    </div>
   </section>
   <div className="promise-strip"><span><Sparkles size={18}/> Designed around your story</span><span><Globe2 size={18}/> Printed just for you</span><span><Check size={18}/> Full-color, direct-to-garment</span></div>
   <section id="story" className="story"><div><p className="eyebrow">A SMALL UNIVERSE. ENTIRELY YOURS.</p><h2>You had to<br/><em>be there.</em></h2></div><div><p>And now, you can take it with you.</p><p>Your place, date, and words become the starting point for a distinct, generative orbit. Change a detail and the geometry changes with it. An abstract fingerprint of a moment, made in your colors.</p><p className="story-footnote">Personal art, not an astronomical star chart. No two stories need to look the same.</p></div></section>
   <section id="details" className="details-grid"><article><span>01 / THE CANVAS</span><h3>A good tee comes first.</h3><p>Black Gildan 64000 Softstyle. Soft, ring-spun cotton, a classic crew neck, and a unisex fit. Sizes S–2XL.</p></article><article><span>02 / THE COLOR</span><h3>Made for full color.</h3><p>Fine orbit lines and a three-color spectrum, printed directly onto the garment. One custom front print. No stock graphic with your name pasted on.</p></article><article><span>03 / THE JOURNEY</span><h3>Made when you say so.</h3><p>Printed to order after successful payment. US delivery only, $6 per order. Allow an estimated 7–14 business days for printing and shipping when the store goes live.</p></article></section>
   <section className="faq"><h2>A few things to know.</h2><div><details><summary>Can I change my design after ordering?</summary><p>Review your design, spelling, date, and size carefully. Orders are submitted for printing after successful payment, so changes may not be possible afterward.</p></details><details><summary>How do I care for my Orbit tee?</summary><p>Wash inside out on a cold, gentle cycle. Avoid bleach and ironing directly on the print. Air drying helps the artwork last.</p></details><details><summary>Is this store taking real orders?</summary><p>{testMode?'This is a sandbox store. Stripe test payments do not charge your card, and Prodigi sandbox orders are never manufactured or shipped. Checkout requires a connected Stripe test account.':'Yes. Your payment is processed securely by Stripe and your tee is printed to order through Prodigi.'}</p></details></div></section>
  </main>
  <footer><a className="wordmark" href="/">✳ PERSONAL ORBIT</a><span>A moment, made wearable.</span><a href="/policies">Shipping, returns & privacy <ArrowUpRight size={14}/></a><span>© {new Date().getFullYear()} PERSONAL ORBIT</span></footer>
 </>;
}
