'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, Globe2, LockKeyhole, Minus, Plus, Sparkles, X } from 'lucide-react';
import { INITIAL, PALETTES, SIZES, designSvg, fingerprint, validateDesign, type Design } from '../lib/design';
export default function Store() {
  const [design,setDesign]=useState<Design>(INITIAL),[size,setSize]=useState('m'),[view,setView]=useState('shirt');
  const [modal,setModal]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[approved,setApproved]=useState(false);
  const [config,setConfig]=useState<{ready:boolean;mode:string}|null>(null);
  const svg=useMemo(()=>designSvg(design),[design]);
  useEffect(()=>{ fetch('/api/config').then(r=>r.json()).then((d:any)=>setConfig(d)).catch(()=>setConfig({ready:false,mode:'unavailable'}));
    try { const saved=sessionStorage.getItem('elsewhere-design'); if(saved){const d=JSON.parse(saved);setDesign(validateDesign(d.design));if(SIZES.includes(d.size))setSize(d.size);} }catch{}
  },[]);
  useEffect(()=>{try{sessionStorage.setItem('elsewhere-design',JSON.stringify({design,size}));}catch{}setApproved(false);},[design,size]);
  useEffect(()=>{if(!modal)return;const previous=document.activeElement as HTMLElement;const before=document.body.style.overflow;document.body.style.overflow='hidden';const handle=(e:KeyboardEvent)=>{if(e.key==='Escape')setModal('');if(e.key==='Tab'){const nodes=Array.from(document.querySelectorAll<HTMLElement>('.modal button,.modal a,.modal input'));const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',handle);return()=>{document.body.style.overflow=before;document.removeEventListener('keydown',handle);previous?.focus();};},[modal]);
  function update(key:keyof Design,value:string){setDesign(d=>({...d,[key]:value}));setError('');}
  async function checkout(){
    setError(''); try{const d=validateDesign(design);if(!approved)throw new Error('Please approve your spelling and design before checkout.');setBusy(true);
      const res=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({design:d,size,approved:true})});
      const data:any=await res.json();if(!res.ok)throw new Error(data.error||'Checkout is unavailable.'); window.location.assign(data.url);
    }catch(e:any){setError(e.message);setBusy(false);}
  }
  async function download(){setError('');try{const d=validateDesign(design);const r=await fetch('/api/proof',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});if(!r.ok)throw new Error('Could not prepare your artwork. Please try again.');const u=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=u;a.download='elsewhere-print-proof.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e:any){setError(e.message);}}
  return <>
    <div className="announcement">Made for one. Made to mean something. <span>Printed on demand · US delivery</span></div>
    <header><a className="wordmark" href="/" aria-label="Elsewhere home">ELSEWHERE<span>™</span></a><nav><a href="#studio">The personal edition</a><a href="#story">Our approach</a><button onClick={()=>setModal('guide')}>Size guide</button></nav><span className="header-note">OBJECTS WITH A STORY</span></header>
    <main>
      <div className="breadcrumb"><span>THE PERSONAL EDITION</span><span>001 / A PLACE IN TIME</span></div>
      <section className="studio" id="studio">
        <div className="product-column">
          <div className={`product-image ${view==='art'?'art-view':''}`}>
            <span className="image-label">YOUR STORY, IN ORBIT</span>
            {view==='shirt'&&<img src="/shirt.png" alt="Black crewneck T-shirt, shown with your custom orbital artwork" className="shirt"/>}
            <div className={view==='shirt'?'shirt-print':'flat-print'} role="img" aria-label={`Your custom ${design.place} design, ${design.date}`} dangerouslySetInnerHTML={{__html:svg}}/>
            <button className="zoom" onClick={()=>setModal('art')} aria-label="Enlarge personalized artwork"><Plus size={22}/></button>
            <span className="image-caption">{view==='shirt'?'Front / black cotton':'Your print / transparent background'}</span>
          </div>
          <div className="preview-controls"><div className="view-switch" aria-label="Preview type"><button className={view==='shirt'?'active':''} onClick={()=>setView('shirt')}>On the shirt</button><button className={view==='art'?'active':''} onClick={()=>setView('art')}>The artwork</button></div><span><span className="live-dot"/> Live personalization</span></div>
          <p className="preview-disclaimer">Illustrative mockup. Print placement and colors may vary slightly on fabric.</p>
          <div className="edition-note"><span>01—</span><p>A first trip. A hometown. The place you met.<br/>Some coordinates only make sense to you.</p></div>
        </div>
        <div className="customizer">
          <div className="eyebrow"><span>ONE MEMORY. ONE ORIGINAL.</span><Sparkles size={16}/></div>
          <div className="title-row"><h1>A place<br/><em>in time.</em></h1><div className="price">$42<span>USD</span></div></div>
          <p className="intro">Turn a place and a moment into a wearable original. Your details shape a one-of-a-kind orbit, printed just for you.</p>
          <div className="product-meta"><span>100% ring-spun cotton</span><span>Unisex fit</span><span>Made to order</span></div>
          <div className="step-heading"><span>01</span><h2>Make it personal</h2><span className="small">YOUR DETAILS BECOME THE DESIGN</span></div>
          <label className="field">Your place <span>{design.place.length}/24</span><input value={design.place} maxLength={24} onChange={e=>update('place',e.target.value.toUpperCase())} placeholder="A place that means something" autoComplete="off"/></label>
          <div className="field-row"><label className="field">Your moment<input type="date" value={design.date} min="1900-01-01" max="2100-12-31" onChange={e=>update('date',e.target.value)}/></label><div className="design-id">YOUR ORBIT ID<strong>{fingerprint(design).toString(16).toUpperCase().padStart(8,'0')}</strong><span>Changes with your story</span></div></div>
          <label className="field">A few words <span>OPTIONAL · {design.dedication.length}/36</span><input value={design.dedication} maxLength={36} onChange={e=>update('dedication',e.target.value.toUpperCase())} placeholder="A dedication, a name, a feeling" autoComplete="off"/></label>
          <p className="input-help">English letters, numbers and simple punctuation. Every detail changes the orbit; this is abstract art, not a star chart.</p>
          <fieldset className="palette"><legend>Choose your ink <span>{PALETTES[design.palette].name}</span></legend><div>{Object.entries(PALETTES).map(([key,p])=><button key={key} aria-pressed={design.palette===key} onClick={()=>update('palette',key)} className={design.palette===key?'chosen':''}><span className="swatch" style={{background:`linear-gradient(135deg,${p.colors.join(',')})`}}/>{p.name}{design.palette===key&&<Check size={14}/>}</button>)}</div></fieldset>
          <div className="step-heading second"><span>02</span><h2>Find your fit</h2><button className="text-button" onClick={()=>setModal('guide')}>Size guide</button></div>
          <div className="sizes" role="group" aria-label="Shirt size">{SIZES.map(s=><button key={s} aria-pressed={size===s} className={size===s?'selected':''} onClick={()=>setSize(s)}>{s.toUpperCase()}</button>)}</div>
          <p className="size-note">Black · Gildan 64000 · Regular unisex fit</p>
          <label className="approval"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/><span>I’ve checked my spelling, date, design and size.</span></label>
          <div className="order-total"><span>Your personal edition</span><strong>$42.00</strong><span>US standard shipping</span><span>$6.00</span><b>Total</b><b>$48.00 USD</b></div>
          {config&&!config.ready&&<div className="sandbox-note"><strong>The studio is open. Checkout is coming soon.</strong><span>Explore your design and download your artwork. Payments are not connected yet.</span></div>}
          {config?.ready&&config.mode==='sandbox'&&<div className="sandbox-note"><strong>Test store</strong><span>Use a Stripe test card. No money is charged and no shirts are shipped.</span></div>}
          {error&&<p className="error" role="alert">{error}</p>}
          <button className="checkout" disabled={busy||!config?.ready||!approved} onClick={checkout}><LockKeyhole size={17}/>{busy?'Preparing your checkout…':config?.ready?'Checkout with Stripe · $48':'Checkout not connected'}</button>
          <button className="download" onClick={download}>Download your print proof <ArrowUpRight size={15}/></button>
          <p className="checkout-foot">One shirt, made for you. Secure payment before printing.</p>
          <div className="product-details">
            <details><summary>The shirt & the print <Plus size={16}/></summary><p>A black Gildan 64000 Softstyle tee in 100% ring-spun cotton. Your unique artwork is printed on the front with direct-to-garment technology, using fine color transitions and a soft, wearable print.</p><p>Wash inside out on a cool cycle. Do not iron directly on the design.</p></details>
            <details><summary>Shipping & made-to-order care <Plus size={16}/></summary><p>This first edition ships within the United States for a flat $6. Production and delivery times depend on the print partner and destination; no delivery date is guaranteed. In sandbox mode, nothing is printed or shipped.</p><p>Check your spelling and size carefully. Each shirt is personalized. Commercial returns, defect support, and delivery policies must be finalized before this store begins accepting live orders.</p></details>
          </div>
        </div>
      </section>
      <section id="story" className="story"><div className="story-top"><span className="eyebrow">LESS GENERIC. MORE YOU.</span><Globe2 size={28}/></div><h2>Not just a place.<br/><em>Your place.</em></h2><div className="story-grid"><p>We turn the details you carry with you into something you can wear. Your place, date and words generate an original orbit — a little fingerprint of a moment that matters.</p><div><h3>Designed by your story</h3><p>Change a word or a date and the lines take a new shape. Choose the colors that feel like the memory.</p></div><div><h3>Printed one at a time</h3><p>A full-color print, created only for your order. No warehouse of identical stories. Just yours.</p></div></div></section>
    </main>
    <footer><a className="wordmark" href="/">ELSEWHERE<span>™</span></a><span>EVERYWHERE YOU’VE BEEN. EVERYTHING YOU ARE.</span><div><button onClick={()=>setModal('privacy')}>Privacy</button><button onClick={()=>setModal('terms')}>Store terms</button></div><small>© {new Date().getFullYear()} ELSEWHERE · Personal edition 001</small></footer>
    {modal&&<div className="modal-backdrop" onClick={()=>setModal('')}><div className={`modal ${modal==='art'?'art-modal':''}`} role="dialog" aria-modal="true" aria-label={modal==='guide'?'Size guide':modal==='art'?'Artwork preview':'Store information'} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setModal('');}}><button autoFocus className="close" aria-label="Close" onClick={()=>setModal('')}><X/></button>
      {modal==='guide'?<><span className="eyebrow">FIND YOUR EVERYDAY FIT</span><h2>A little room<br/>to be yourself.</h2><p>Gildan 64000 · unisex regular fit. Measure a tee you love flat, then compare. Measurements in inches; manufacturing tolerances apply.</p><table><thead><tr><th>Size</th><th>Width</th><th>Length</th></tr></thead><tbody>{[['S','18','28'],['M','20','29'],['L','22','30'],['XL','24','31'],['2XL','26','32']].map(r=><tr key={r[0]}>{r.map((c,i)=><td key={i}>{c}</td>)}</tr>)}</tbody></table><p>Width is measured across the chest, not around it. For a looser fit, consider sizing up.</p></>:modal==='art'?<><div dangerouslySetInnerHTML={{__html:svg}}/><p>Your personalized artwork · print colors may vary on fabric.</p></>:modal==='privacy'?<><h2>Your story stays yours.</h2><p>Design details, size, order identifiers and payment status are stored to process your order. Stripe processes card and contact details; the store never receives your full card number. After confirmed payment, the shipping address and print file are sent to Prodigi for fulfillment.</p><p>Your order-status link is private: anyone holding it can view your order. Print files use long, unguessable links so the print partner can download them. Do not put sensitive personal information in your design. Draft customization is saved in this browser session.</p><p>This is a sandbox store. A merchant contact and retention/deletion policy must be added before accepting live orders.</p></>:<><h2>The personal edition.</h2><p>One personalized black T-shirt is $42 USD, plus $6 US shipping. The current store is a sandbox; payment and fulfillment use test environments when configured. No real product is delivered in sandbox mode.</p><p>You approve your text, date, design and size before checkout. Mockups illustrate the design; the actual print may differ slightly in color and placement. Artwork is abstract and does not represent astronomical positions.</p><p>Before commercial launch, the merchant must publish business identity, customer support contact, tax treatment, delivery estimates, and return/cancellation terms. Live checkout stays disabled until production configuration is explicitly enabled.</p></>}
    </div></div>}
  </>;
}
