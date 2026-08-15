import './styles.css';

const state = { fit: 'fitted', size: 'M', loading: false };
const app = document.querySelector('#app');
const pad = n => String(n).padStart(2, '0');
const timestamp = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,'0')}`; };

function shirtSvg() { return `<svg class="shirt-svg" viewBox="0 0 520 620" aria-label="Black t-shirt preview"><path class="shirt" d="M164 61 217 42c10 34 29 52 43 52s33-18 43-52l53 19 131 134-59 63-39-31 7 296H124l7-296-39 31-59-63L164 61Z"/><path class="seam" d="M217 43c8 24 23 44 43 51 20-7 35-27 43-51M132 197l-8 325m264-325 8 325"/></svg>`; }
function render() {
  const now = timestamp();
  app.innerHTML = `<header><a class="wordmark" href="/">datetime<span>.store</span></a><div class="header-note">EST. 2016&nbsp; / &nbsp;ONE SHIRT, EVERY MOMENT</div></header>
  <main><section class="intro"><p class="eyebrow">The current time, in cotton</p><h1>Wear the<br><em>moment.</em></h1><p class="lede">A timestamp you can actually hold on to. Printed on demand, updated every millisecond.</p><div class="stamp"><span class="pulse"></span><span id="live">${now}</span> <small>LOCAL TIME</small></div></section>
  <section class="product"><div class="product-art"><div class="edition">LIMITED<br>EDITION<br><b>∞ / ∞</b></div>${shirtSvg()}<div class="print-time" id="shirt-time">${now}</div><div class="price"><del>$30</del> $22.50</div></div><div class="order-card"><div class="card-top"><span>YOUR SHIRT</span><span class="stock">● MADE TO ORDER</span></div><h2>Choose your cut.</h2><div class="field-label">STYLE</div><div class="choices" id="fits"><button class="choice ${state.fit==='fitted'?'selected':''}" data-fit="fitted">Fitted <small>shaped, close to body</small></button><button class="choice ${state.fit==='unisex'?'selected':''}" data-fit="unisex">Unisex <small>classic, relaxed</small></button></div><div class="field-label">SIZE</div><div class="sizes" id="sizes">${['S','M','L','XL'].map(s=>`<button class="size ${state.size===s?'selected':''}" data-size="${s}">${s}</button>`).join('')}</div><button id="buy" class="buy">Continue to checkout <span>↗</span></button><p class="shipping">Free US shipping · Ships in 5–7 business days<br>Secure checkout powered by Stripe</p><div id="message" class="message" role="alert"></div></div></section></main><footer><span>© datetime.store</span><span>NO TWO SHIRTS ARE EVER THE SAME</span><a href="mailto:hello@dat e time.store">hello@dat e time.store</a></footer>`;
  document.querySelectorAll('[data-fit]').forEach(b=>b.onclick=()=>{state.fit=b.dataset.fit; render();});
  document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{state.size=b.dataset.size; render();});
  document.querySelector('#buy').onclick=checkout;
}
async function checkout() { const button=document.querySelector('#buy'); button.disabled=true; button.innerHTML='Preparing your checkout <span class="spinner"></span>'; try { const res=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fit:state.fit,size:state.size,timestamp:document.querySelector('#live').textContent})}); const data=await res.json(); if(!res.ok) throw new Error(data.error||'Unable to start checkout.'); location.href=data.url; } catch(e) { document.querySelector('#message').textContent=e.message; button.disabled=false; button.innerHTML='Continue to checkout <span>↗</span>'; } }
render();
setInterval(()=>{const t=timestamp(); const live=document.querySelector('#live'); const shirt=document.querySelector('#shirt-time'); if(live) live.textContent=t; if(shirt) shirt.textContent=t;}, 37);
