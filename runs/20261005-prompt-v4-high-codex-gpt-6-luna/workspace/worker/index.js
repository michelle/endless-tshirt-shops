const SKU = "GLOBAL-TEE-BC-3001";
const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];
const COLORS = ["black", "navy blue", "white", "cream", "army", "asphalt"];
const COUNTRIES = ["US", "CA", "GB", "AU", "NZ", "DE", "FR", "IT", "ES", "NL", "SE", "IE"];
const COUNTRY_NAMES = { US: "United States", CA: "Canada", GB: "United Kingdom", AU: "Australia", NZ: "New Zealand", DE: "Germany", FR: "France", IT: "Italy", ES: "Spain", NL: "Netherlands", SE: "Sweden", IE: "Ireland" };
const INK = "#c4f27a";

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101411"><meta name="description" content="A one-of-one night sky, made from your story and printed on a premium tee.">
  <title>Night Atlas — Wear your night</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
    :root{--ink:#c4f27a;--paper:#f2f0e8;--night:#101411;--muted:#a6ada1;--line:#303830;--mono:'DM Mono',monospace;--sans:'DM Sans',sans-serif;--serif:'Playfair Display',Georgia,serif}
    *{box-sizing:border-box}body{margin:0;background:var(--night);color:var(--paper);font-family:var(--sans);-webkit-font-smoothing:antialiased}button,input,select{font:inherit}a{color:inherit}.shell{max-width:1300px;margin:auto;padding:0 42px}.nav{height:78px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff18}.brand{display:flex;align-items:center;gap:12px;font:500 13px var(--mono);letter-spacing:.12em;text-transform:uppercase}.mark{width:25px;height:25px;border:1px solid var(--ink);border-radius:50%;position:relative}.mark:before,.mark:after{content:"";position:absolute;background:var(--ink);height:1px;width:32px;left:-5px;top:11px;transform:rotate(45deg)}.mark:after{transform:rotate(-45deg)}.nav-note{font:11px var(--mono);color:var(--muted);letter-spacing:.08em}.nav-link{color:var(--ink);text-decoration:none;font:11px var(--mono);letter-spacing:.1em;text-transform:uppercase}
    .hero{display:grid;grid-template-columns:1fr 1.04fr;gap:72px;align-items:center;padding:55px 0 80px}.eyebrow{font:11px var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--ink);display:flex;align-items:center;gap:10px}.eyebrow:before{content:"";display:inline-block;width:25px;height:1px;background:var(--ink)}h1{font:500 clamp(46px,5.7vw,78px)/1.02 var(--serif);letter-spacing:-.045em;margin:24px 0 20px;max-width:580px}h1 em{color:var(--ink);font-weight:500}.intro{color:#c3c8bf;font-size:15px;line-height:1.7;max-width:440px;margin:0 0 26px}.price{font:500 13px var(--mono);letter-spacing:.04em;margin:0 0 7px}.price small{color:var(--muted);font:11px var(--sans);letter-spacing:0}.proof{display:flex;gap:18px;flex-wrap:wrap;margin-top:22px;color:var(--muted);font:10px var(--mono);letter-spacing:.05em}.proof span:before{content:"✳";color:var(--ink);padding-right:7px}
    .stage{position:relative;min-height:560px;border:1px solid #ffffff20;border-radius:4px;background:radial-gradient(ellipse at 52% 40%,#232c24 0%,#151b16 55%,#111612 100%);display:flex;align-items:center;justify-content:center;overflow:hidden}.stage:before{content:"";position:absolute;width:430px;height:430px;border:1px solid #ffffff12;border-radius:50%;left:50%;top:47%;transform:translate(-50%,-50%)}.stage:after{content:"";position:absolute;width:540px;height:540px;border:1px solid #ffffff0b;border-radius:50%;left:50%;top:47%;transform:translate(-50%,-50%)}.stage-label{position:absolute;left:20px;top:18px;color:#929b8f;font:9px var(--mono);letter-spacing:.15em;text-transform:uppercase}.stage-caption{position:absolute;right:20px;bottom:18px;color:#929b8f;font:9px var(--mono);letter-spacing:.11em;text-transform:uppercase}
    .tee{position:relative;width:min(78%,400px);aspect-ratio:1/1.03;filter:drop-shadow(0 30px 34px #0009);z-index:1;transition:filter .2s}.tee svg{width:100%;height:100%;overflow:visible}.shirt-base{fill:#e9e6da;transition:fill .2s}.art-frame{position:absolute;left:36%;top:33%;width:29%;height:35%;display:grid;place-items:center}.art-frame img{width:100%;height:100%;object-fit:contain}.stage[data-color="black"] .shirt-base{fill:#202522}.stage[data-color="navy blue"] .shirt-base{fill:#26313a}.stage[data-color="white"] .shirt-base{fill:#eee}.stage[data-color="cream"] .shirt-base{fill:#d5c9ac}.stage[data-color="army"] .shirt-base{fill:#576247}.stage[data-color="asphalt"] .shirt-base{fill:#444746}
    .builder{border-top:1px solid #ffffff1c;padding-top:24px}.builder-title{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px}.builder-title strong{font:500 12px var(--mono);letter-spacing:.11em;text-transform:uppercase}.builder-title span{font:10px var(--mono);color:var(--muted)}.field{margin:0 0 16px}.field label,.group-label{display:block;margin:0 0 7px;color:#d4d9cf;font:10px var(--mono);letter-spacing:.1em;text-transform:uppercase}.field input,.field select{width:100%;border:1px solid #434a42;border-radius:2px;background:#161c17;color:var(--paper);padding:12px 13px;font-size:13px;outline:none}.field input:focus,.field select:focus{border-color:var(--ink)}.field input::placeholder{color:#70786e}.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.swatches{display:flex;gap:9px}.swatch{width:25px;height:25px;border-radius:50%;border:1px solid #ffffff50;padding:0;cursor:pointer;position:relative}.swatch[aria-checked="true"]:after{content:"";position:absolute;inset:-4px;border:1px solid var(--ink);border-radius:50%}.swatch[data-value="black"]{background:#202522}.swatch[data-value="navy blue"]{background:#26313a}.swatch[data-value="white"]{background:#eee}.swatch[data-value="cream"]{background:#d5c9ac}.swatch[data-value="army"]{background:#576247}.swatch[data-value="asphalt"]{background:#444746}.color-row{display:flex;align-items:center;justify-content:space-between}.color-name{color:var(--muted);font-size:11px}.buy{width:100%;margin-top:8px;padding:16px 18px;border:0;background:var(--ink);color:#101411;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font:500 11px var(--mono);letter-spacing:.09em;text-transform:uppercase;transition:background .2s}.buy:hover{background:#d2ff91}.buy:disabled{opacity:.55;cursor:wait}.buy-arrow{font-size:17px}.smallprint{color:#878f84;font-size:10px;line-height:1.55;margin:12px 0 0}.error{display:none;margin-top:12px;padding:12px;border:1px solid #855b4b;color:#ffc7ad;font-size:12px;line-height:1.5}.error.show{display:block}.price-loading{opacity:.65}
    .story{border-top:1px solid #ffffff1c;padding:78px 0 74px;display:grid;grid-template-columns:1fr 1.1fr;gap:60px}.story h2{font:500 38px/1.12 var(--serif);letter-spacing:-.025em;margin:17px 0}.story p{font-size:13px;color:#b3b9af;line-height:1.8;margin:0;max-width:440px}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.step{border-top:1px solid #5e695d;padding-top:13px}.step b{display:block;color:var(--ink);font:11px var(--mono);margin-bottom:13px}.step strong{display:block;font:500 13px var(--sans);margin-bottom:7px}.step span{display:block;color:#9ca49a;font-size:11px;line-height:1.55}.foot{border-top:1px solid #ffffff1c;padding:22px 0 30px;display:flex;justify-content:space-between;color:#828a7f;font:9px var(--mono);letter-spacing:.08em;text-transform:uppercase}.foot a{color:#aeb7a9;text-decoration:none}
    .modal{position:fixed;inset:0;background:#050806df;z-index:5;display:none;place-items:center;padding:20px}.modal.open{display:grid}.modal-card{max-width:420px;width:100%;background:#181e19;border:1px solid #ffffff25;padding:28px}.modal-card h2{font:500 28px var(--serif);margin:0 0 10px}.modal-card p{font-size:12px;color:#b3b9af;line-height:1.7}.modal-card button{border:1px solid #65705e;background:transparent;color:var(--paper);padding:11px 14px;cursor:pointer;font:10px var(--mono);text-transform:uppercase;letter-spacing:.08em}.success-mark{color:var(--ink);font-size:25px;margin-bottom:18px}.config{font:10px var(--mono);color:#acb5aa;word-break:break-all}.sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:920px){.hero{grid-template-columns:1fr;gap:28px;padding:40px 0 60px}.stage{min-height:480px;grid-row:1}.hero-copy{grid-row:2}.shell{padding:0 24px}.story{grid-template-columns:1fr;gap:30px}}@media(max-width:560px){.shell{padding:0 18px}.nav{height:64px}.nav-note{display:none}.hero{padding-top:20px;gap:27px}.stage{min-height:390px}.stage:before{width:310px;height:310px}.stage:after{width:390px;height:390px}.tee{width:88%}h1{font-size:48px;margin:18px 0}.intro{font-size:13px}.row{gap:9px}.story{padding:55px 0}.story h2{font-size:32px}.steps{gap:10px}.step span{font-size:10px}.foot{font-size:8px;gap:12px;flex-wrap:wrap}}
  </style>
</head>
<body>
<div class="shell">
  <nav class="nav"><a class="brand" href="/" aria-label="Night Atlas home"><span class="mark"></span>Night Atlas</a><span class="nav-note">PERSONAL CONSTELLATION STUDIES · Nº 001</span><a class="nav-link" href="#story">Our process ↘</a></nav>
  <main class="hero">
    <section class="hero-copy">
      <div class="eyebrow">A map made from your moment</div>
      <h1>Wear the night<br>that <em>stayed.</em></h1>
      <p class="intro">A place. A date. A name you hold close. We turn your moment into a one-of-one constellation map, then print it on a soft, made-for-you tee.</p>
      <div class="price"><span id="price">$—</span> <small id="price-note">standard shipping included · USD</small></div>
      <div class="proof"><span>Made to order</span><span>Premium cotton</span><span>Printed for you</span></div>
      <div class="builder">
        <div class="builder-title"><strong>Make it yours</strong><span>01 — 03</span></div>
        <div class="field"><label for="name">Name or short dedication</label><input id="name" maxlength="18" placeholder="e.g. For Mira" value="Mira" autocomplete="off"></div>
        <div class="row">
          <div class="field"><label for="date">The date</label><input id="date" type="date" value="2024-08-17"></div>
          <div class="field"><label for="place">The place</label><input id="place" maxlength="28" placeholder="e.g. Big Sur, California" value="Big Sur, California" autocomplete="off"></div>
        </div>
        <div class="row">
          <div class="field"><label for="country">Ship to</label><select id="country"><option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="AU">Australia</option><option value="NZ">New Zealand</option><option value="DE">Germany</option><option value="FR">France</option><option value="IT">Italy</option><option value="ES">Spain</option><option value="NL">Netherlands</option><option value="SE">Sweden</option><option value="IE">Ireland</option></select></div>
          <div class="field"><label for="size">Your size</label><select id="size"><option value="xs">XS</option><option value="s">S</option><option value="m" selected>M</option><option value="l">L</option><option value="xl">XL</option><option value="2xl">2XL</option><option value="3xl">3XL</option><option value="4xl">4XL</option></select></div>
        </div>
        <div class="field color-row"><div><span class="group-label">Shirt color</span><div class="swatches" role="radiogroup" aria-label="Shirt color"><button class="swatch" data-value="black" aria-label="Black" aria-checked="true" role="radio"></button><button class="swatch" data-value="navy blue" aria-label="Navy blue" aria-checked="false" role="radio"></button><button class="swatch" data-value="white" aria-label="White" aria-checked="false" role="radio"></button><button class="swatch" data-value="cream" aria-label="Cream" aria-checked="false" role="radio"></button><button class="swatch" data-value="army" aria-label="Army green" aria-checked="false" role="radio"></button><button class="swatch" data-value="asphalt" aria-label="Asphalt" aria-checked="false" role="radio"></button></div></div><span class="color-name" id="color-name">Black</span></div>
        <button class="buy" id="buy"><span id="buy-label">Create your night map</span><span class="buy-arrow">↗</span></button>
        <p class="smallprint">Your design is a unique, decorative star map generated from the details you share. It isn’t an astronomical chart. Secure payment by Stripe. We only send the shirt to print after payment is confirmed.</p>
        <div class="error" id="error" role="alert"></div>
      </div>
    </section>
    <section class="stage" id="stage" data-color="black" aria-label="Preview of your personalized tee"><div class="stage-label">GARMENT PREVIEW · FRONT</div>
      <div class="tee"><svg viewBox="0 0 420 430" role="img" aria-label="Bella Canvas style t-shirt mockup"><path class="shirt-base" d="M128 45 169 30c8 16 21 25 41 25s33-9 41-25l41 15 77 58-38 59-43-25v232H132V137l-43 25-38-59z"/><path d="M169 30c8 16 21 25 41 25s33-9 41-25" fill="none" stroke="#101411" stroke-opacity=".35" stroke-width="4"/><path d="M130 138v230m160-230v230" fill="none" stroke="#101411" stroke-opacity=".16" stroke-width="2"/><path d="M181 36c4 13 13 21 29 21s25-8 29-21" fill="none" stroke="#c4f27a" stroke-opacity=".35" stroke-width="1.5"/></svg><div class="art-frame"><img id="preview" alt="Personalized constellation artwork preview"></div></div><div class="stage-caption">YOUR STORY, IN STARS · 01 / 01</div></section>
  </main>
  <section class="story" id="story"><div><div class="eyebrow">Every shirt starts with a story</div><h2>Not a template.<br>Your own little universe.</h2><p>We translate your date and place into a bespoke constellation composition, set your dedication into its own edition, and print it directly onto a premium cotton shirt. Made one at a time, just for you.</p></div><div class="steps"><div class="step"><b>01 / INPUT</b><strong>Give us the moment</strong><span>A meaningful date, a place, and up to 18 characters.</span></div><div class="step"><b>02 / COMPOSE</b><strong>See your sky take shape</strong><span>Each combination creates its own star positions and connected pattern.</span></div><div class="step"><b>03 / PRINT</b><strong>Made only after checkout</strong><span>Your map is printed on a Bella+Canvas 3001 and shipped to your door.</span></div></div></section>
  <footer class="foot"><span>Night Atlas Studio · Est. under the same sky</span><span>One story. One shirt. <a href="/setup">Store setup</a></span></footer>
</div>
<div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-card"><div class="success-mark">✳</div><h2 id="modal-title">The night is yours.</h2><p id="modal-copy">Your payment was received. We’re preparing your custom print.</p><button onclick="location.href='/'">Back to the studio</button></div></div>
<script>
const $=s=>document.querySelector(s);let color='black', quoteTimer;
function q(){const n=$('#name').value||'Your name',d=$('#date').value||'your date',p=$('#place').value||'your place';return '/api/preview?name='+encodeURIComponent(n)+'&date='+encodeURIComponent(d)+'&place='+encodeURIComponent(p)+'&color='+encodeURIComponent(color)}
function preview(){const img=$('#preview');img.src=q()+'&t='+Date.now()}
async function price(){clearTimeout(quoteTimer);quoteTimer=setTimeout(async()=>{const out=$('#price');out.classList.add('price-loading');try{const r=await fetch('/api/quote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:$('#country').value,size:$('#size').value,color})});const j=await r.json();out.textContent=j.displayPrice||'Unavailable';$('#price-note').textContent=j.message||'standard shipping included · USD'}catch{out.textContent='Price on request'}finally{out.classList.remove('price-loading')}},220)}
for(const input of ['#name','#date','#place'])$(input).addEventListener('input',preview);for(const input of ['#country','#size'])$(input).addEventListener('change',price);
document.querySelectorAll('.swatch').forEach(b=>b.addEventListener('click',()=>{color=b.dataset.value;document.querySelectorAll('.swatch').forEach(x=>x.setAttribute('aria-checked',x===b?'true':'false'));$('#color-name').textContent=b.getAttribute('aria-label');$('#stage').dataset.color=color;price()}));
$('#buy').addEventListener('click',async()=>{const name=$('#name').value.trim(),place=$('#place').value.trim(),date=$('#date').value,err=$('#error'),button=$('#buy');err.classList.remove('show');if(!name||!place||!date){err.textContent='Add a name, place, and date so we can compose your map.';err.classList.add('show');return}button.disabled=true;$('#buy-label').textContent='Preparing your checkout…';try{const r=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,place,date,country:$('#country').value,size:$('#size').value,color})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Checkout could not be started.');location.href=j.url}catch(e){err.textContent=e.message;err.classList.add('show');button.disabled=false;$('#buy-label').textContent='Create your night map'}});
preview();price();const params=new URLSearchParams(location.search);if(params.get('paid')==='1'){ $('#modal').classList.add('open') }
</script>
</body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
    if (url.pathname === "/") return html(page);
    if (url.pathname === "/setup") return html(setupPage(url.origin));
    if (url.pathname === "/success") return successRoute(url.searchParams.get("session_id"), env);
    if (url.pathname === "/api/preview" && request.method === "GET") {
      const p = personalization(Object.fromEntries(url.searchParams));
      return new Response(previewSvg(p), { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/api/quote" && request.method === "POST") return quoteRoute(request, env);
    if (url.pathname === "/api/checkout" && request.method === "POST") return checkoutRoute(request, env, url.origin);
    if (url.pathname === "/api/stripe/webhook" && request.method === "POST") return webhookRoute(request, env, url.origin);
    const artMatch = url.pathname.match(/^\/api\/art\/(cs_[A-Za-z0-9_]+)\.png$/);
    if (artMatch && request.method === "GET") return artRoute(artMatch[1], env);
    if (url.pathname === "/health") return json({ ok: true, paymentReady: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET), printReady: Boolean(env.PRODIGI_API_KEY) });
    return new Response("Not found", { status: 404 });
  },
};

function html(body) { return new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" } }); }
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsHeaders() } }); }
function corsHeaders() { return { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" }; }
function safeText(v, max) { return String(v || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max); }
function personalization(v) { return { name: safeText(v.name, 18) || "YOUR NAME", place: safeText(v.place, 28) || "SOMEWHERE SPECIAL", date: /^\d{4}-\d{2}-\d{2}$/.test(v.date || "") ? v.date : "2024-08-17", color: COLORS.includes(v.color) ? v.color : "black" }; }
function hashSeed(s) { let h = 2166136261; for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function random(seed) { let x=seed>>>0; return ()=>{ x^=x<<13; x^=x>>>17; x^=x<<5; return (x>>>0)/4294967296; }; }
function sky(p) { const rand=random(hashSeed(`${p.name}|${p.date}|${p.place}`)); const cx=2340,cy=2860,r=1230,stars=[]; for(let i=0;i<15;i++){const a=rand()*Math.PI*2,rr=Math.sqrt(rand())*r;stars.push({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr,bright:i<7?1:0,r:i<7?14+rand()*10:5+rand()*7})} const chain=[0,2,4,6,8,10,12,14].map(i=>stars[i]); return {stars,chain,cx,cy,r}; }
function xml(s) { return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c])); }
function titleCase(s) { return s.toUpperCase(); }
function previewSvg(p) {
  const {stars,chain,cx,cy,r}=sky(p),pal=palette(p.color); let lines="";
  for(let i=0;i<chain.length-1;i++) lines+=`<line x1="${chain[i].x}" y1="${chain[i].y}" x2="${chain[i+1].x}" y2="${chain[i+1].y}" stroke="${pal.ink}" stroke-opacity=".65" stroke-width="5"/>`;
  const dots=stars.map(s=>`<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.bright?pal.highlight:pal.ink}"/><circle cx="${s.x}" cy="${s.y}" r="${s.r*2.2}" fill="${pal.ink}" opacity=".12"/>`).join("");
  const ticks=Array.from({length:48},(_,i)=>{const a=i*Math.PI/24,inner=r-(i%4===0?45:19),outer=r;return `<line x1="${cx+Math.cos(a)*inner}" y1="${cy+Math.sin(a)*inner}" x2="${cx+Math.cos(a)*outer}" y2="${cy+Math.sin(a)*outer}" stroke="${pal.ink}" stroke-opacity="${i%4===0?'.75':'.4'}" stroke-width="${i%4===0?5:3}"/>`}).join("");
  const label=`${p.date.split('-').reverse().join(' · ')}  /  ${titleCase(p.place)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4680 5790"><g fill="none" stroke="${pal.ink}"><circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="4" stroke-opacity=".75"/><circle cx="${cx}" cy="${cy}" r="${r+90}" stroke-width="2" stroke-opacity=".25"/>${ticks}${lines}</g>${dots}<g fill="${pal.ink}" text-anchor="middle" font-family="monospace" letter-spacing="12"><text x="2340" y="980" font-size="78">NIGHT ATLAS  /  PERSONAL SKY NO. 01</text><text x="2340" y="4540" font-size="210" font-weight="bold">${xml(titleCase(p.name))}</text><text x="2340" y="4775" font-size="64" letter-spacing="6">${xml(titleCase(p.place))}</text><text x="2340" y="5010" font-size="58" letter-spacing="12">${xml(label)}</text></g><g fill="${pal.highlight}"><circle cx="2340" cy="${cy-r-180}" r="8"/><circle cx="2340" cy="${cy+r+180}" r="8"/></g></svg>`;
}
function palette(color) { return ["white","cream"].includes(color) ? {ink:"#294436",highlight:"#647849"} : color==="army" ? {ink:"#f2f0e8",highlight:"#c4f27a"} : {ink:INK,highlight:"#f2f0e8"}; }

async function prodigi(path, env, init = {}) {
  if (!env.PRODIGI_API_KEY) throw new Error("Print connection is not configured.");
  const base=(env.PRODIGI_API_BASE||"https://api.sandbox.prodigi.com/v4.0").replace(/\/$/,"");
  const r=await fetch(base+path,{...init,headers:{"X-API-Key":env.PRODIGI_API_KEY,"content-type":"application/json",...(init.headers||{})}});
  const body=await r.json().catch(()=>({})); if(!r.ok) throw new Error(body.message||body.outcome||`Prodigi returned ${r.status}`); return body;
}
function attributes(size,color) { return {brand:"Bella + Canvas",edge:"Crew neck",color,gender:"Unisex",paperType:"100% cotton",size,style:"3001"}; }
async function getQuote(country,size,color,env) {
  if(!COUNTRIES.includes(country)||!SIZES.includes(size)||!COLORS.includes(color)) throw new Error("That shirt option is unavailable.");
  const body=await prodigi("/quotes",env,{method:"POST",body:JSON.stringify({shippingMethod:"Standard",destinationCountryCode:country,currencyCode:"USD",items:[{sku:env.PRODIGI_SKU||SKU,copies:1,attributes:attributes(size,color),assets:[{printArea:"front"}]}]})});
  const quote=body.quotes?.find(q=>q.shipmentMethod?.toLowerCase()==="standard")||body.quotes?.[0];
  if(!quote?.costSummary?.totalCost?.amount) throw new Error(body.issues?.[0]?.description||"This shirt cannot be quoted for that destination.");
  const wholesale=Number(quote.costSummary.totalCost.amount),retail=Math.ceil((wholesale+18.99)*100)/100;
  return {quote,wholesale,retail,currency:(quote.costSummary.totalCost.currency||"USD").toUpperCase()};
}
async function quoteRoute(request,env) {
  try { const b=await request.json();const q=await getQuote(b.country,b.size||"m",b.color||"black",env);return json({amount:q.retail,displayPrice:new Intl.NumberFormat("en-US",{style:"currency",currency:q.currency}).format(q.retail),message:"standard shipping included · USD"}); }
  catch(e){return json({displayPrice:"Unavailable",message:"choose another option",error:e.message},422)}
}
async function checkoutRoute(request,env,origin) {
  if(!env.STRIPE_SECRET_KEY||!env.STRIPE_WEBHOOK_SECRET) return json({error:"Secure checkout is being connected. Add the Stripe test keys and webhook signing secret to finish setup."},503);
  try {
    const b=await request.json(),p=personalization(b),country=String(b.country||"US").toUpperCase(),size=String(b.size||"m").toLowerCase(),color=String(b.color||"black").toLowerCase();
    if(!b.name||!b.place||!/^\d{4}-\d{2}-\d{2}$/.test(b.date||"")) return json({error:"Please provide a name, date, and place."},400);
    const q=await getQuote(country,size,color,env),usd=Math.round(q.retail*100);
    const fields={mode:"payment",success_url:`${origin}/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/?cancelled=1`,"shipping_address_collection[allowed_countries][0]":country,"phone_number_collection[enabled]":"true","line_items[0][price_data][currency]":"usd", "line_items[0][price_data][unit_amount]":String(usd),"line_items[0][price_data][product_data][name]":"Night Atlas — custom constellation tee","line_items[0][price_data][product_data][description]":`${p.name} · ${p.place} · ${p.date} · ${size.toUpperCase()} / ${color}`,"line_items[0][quantity]":"1","metadata[name]":p.name,"metadata[place]":p.place,"metadata[memory_date]":p.date,"metadata[country]":country,"metadata[size]":size,"metadata[color]":color,"metadata[sku]":env.PRODIGI_SKU||SKU,"metadata[quote_currency]":q.currency,"metadata[quote_wholesale]":q.wholesale.toFixed(2),"payment_intent_data[description]":"Night Atlas custom tee — made to order","submit_type":"pay"};
    const r=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams(fields)});const s=await r.json();if(!r.ok)throw new Error(s.error?.message||"Stripe checkout could not be created.");return json({url:s.url});
  } catch(e){return json({error:e.message||"Could not prepare the order."},422)}
}
async function stripeSession(id,env) { const r=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`,{headers:{authorization:`Bearer ${env.STRIPE_SECRET_KEY}`}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error?.message||"Payment session unavailable.");return j; }
async function artRoute(id,env) {
  if(!env.STRIPE_SECRET_KEY)return new Response("Not found",{status:404});
  try{const s=await stripeSession(id,env);if(s.payment_status!=="paid"||s.metadata?.sku!==(env.PRODIGI_SKU||SKU))return new Response("Not found",{status:404});const p=personalization({name:s.metadata.name,place:s.metadata.place,date:s.metadata.memory_date,color:s.metadata.color});const bytes=await createPrintPng(p);return new Response(bytes,{headers:{"content-type":"image/png","cache-control":"public, max-age=86400","x-content-type-options":"nosniff"}})}catch{return new Response("Not found",{status:404})}
}
async function webhookRoute(request,env,origin) {
  if(!env.STRIPE_WEBHOOK_SECRET||!env.STRIPE_SECRET_KEY)return json({error:"Stripe is not configured."},503);
  const raw=await request.text();if(!await verifyStripeSignature(raw,request.headers.get("stripe-signature"),env.STRIPE_WEBHOOK_SECRET))return json({error:"Invalid signature"},400);
  let event;try{event=JSON.parse(raw)}catch{return json({error:"Invalid JSON"},400)};
  if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type))return json({received:true});
  try {
    const s=event.data?.object;if(!s?.id||s.payment_status!=="paid")return json({received:true,paid:false});
    const verified=await stripeSession(s.id,env);if(verified.payment_status!=="paid")return json({received:true,paid:false});
    if(verified.metadata?.sku!==(env.PRODIGI_SKU||SKU))return json({error:"Unknown product"},400);
    const ship=verified.shipping_details||verified.collected_information?.shipping_details;const addr=ship?.address||verified.customer_details?.address;const recipientName=ship?.name||verified.customer_details?.name;
    if(!addr?.line1||!addr?.postal_code||!addr?.country||!addr?.city||!recipientName)throw new Error("Checkout did not include a complete shipping address.");
    const m=verified.metadata,p=personalization({name:m.name,place:m.place,date:m.memory_date,color:m.color}),size=SIZES.includes(m.size)?m.size:"m",color=COLORS.includes(m.color)?m.color:"black",country=String(addr.country).toUpperCase();if(country!==String(m.country||"").toUpperCase())throw new Error("Shipping country did not match the priced destination.");
    const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`night-atlas:${verified.id}`));const hex=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");const key=`${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
    const order={idempotencyKey:key,merchantReference:`night-atlas-${verified.id}`,shippingMethod:"Standard",recipient:{name:recipientName,email:verified.customer_details?.email||undefined,phoneNumber:verified.customer_details?.phone||undefined,address:{line1:addr.line1,line2:addr.line2||null,postalOrZipCode:addr.postal_code,countryCode:country,townOrCity:addr.city,stateOrCounty:addr.state||null}},items:[{sku:env.PRODIGI_SKU||SKU,copies:1,sizing:"fillPrintArea",attributes:attributes(size,color),recipientCost:{amount:(Number(verified.amount_total||0)/100).toFixed(2),currency:String(verified.currency||"usd").toUpperCase()},assets:[{printArea:"front",url:`${origin}/api/art/${verified.id}.png`}]}],metadata:{source:"night-atlas",checkoutSessionId:verified.id,memoryDate:p.date}};
    const result=await prodigi("/orders",env,{method:"POST",body:JSON.stringify(order)});if(!result.order?.id&&!String(result.outcome||"").toLowerCase().includes("alreadyexists"))throw new Error(result.issues?.[0]?.description||"Prodigi did not confirm the order.");return json({received:true,orderId:result.order?.id||null});
  }catch(e){return json({error:e.message||"Fulfillment failed; Stripe will retry this event."},500)}
}
async function verifyStripeSignature(payload,header,secret) {
  if(!header)return false;let timestamp="",signatures=[];for(const part of header.split(",")){const [k,v]=part.split("=");if(k==="t")timestamp=v;if(k==="v1")signatures.push(v)}if(!timestamp||!signatures.length||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${timestamp}.${payload}`)));const expected=[...sig].map(x=>x.toString(16).padStart(2,"0")).join("");return signatures.some(x=>constantTimeEqual(x,expected));
}
function constantTimeEqual(a,b){if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}

function setupPage(origin){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Night Atlas · Store setup</title><style>body{margin:0;background:#101411;color:#f2f0e8;font:15px system-ui;line-height:1.7}.wrap{max-width:720px;margin:9vh auto;padding:28px}a{color:#c4f27a}.ey{font:11px monospace;letter-spacing:.15em;color:#c4f27a}h1{font:48px Georgia;margin:18px 0}li{margin:10px 0}code{color:#d5ff98;background:#202920;padding:2px 5px}.box{border:1px solid #455045;padding:20px;margin:24px 0}.muted{color:#a6ada1}</style></head><body><main class="wrap"><div class="ey">NIGHT ATLAS · OPERATOR SETUP</div><h1>Payments & print</h1><p>This store uses Stripe Checkout for card payments and the Prodigi Print API sandbox for fulfillment. Stripe must confirm a successful payment before an order is submitted to Prodigi.</p><div class="box"><strong>Required runtime secrets</strong><ul><li><code>STRIPE_SECRET_KEY</code> — Stripe test-mode secret key</li><li><code>STRIPE_WEBHOOK_SECRET</code> — signing secret for the endpoint below</li></ul><p>Set both in your Sites environment variables, then redeploy the current version.</p></div><div class="box"><strong>Stripe webhook URL</strong><p><code>${origin}/api/stripe/webhook</code></p><p>Subscribe to <code>checkout.session.completed</code> and <code>checkout.session.async_payment_succeeded</code>. The handler verifies Stripe's signature and the paid session before sending the order to Prodigi.</p></div><p class="muted">Print environment: <code>${origin.includes("localhost")?"sandbox":"Prodigi sandbox"}</code>. Replace the sandbox endpoint and key with live Prodigi credentials before real orders.</p><p><a href="/">← Back to Night Atlas</a></p></main></body></html>`}
async function successRoute(id,env){if(!env.STRIPE_SECRET_KEY||!/^cs_[A-Za-z0-9_]+$/.test(id||""))return html(successPage(false,""));try{const s=await stripeSession(id,env);const paid=s.payment_status==="paid"&&s.metadata?.sku===(env.PRODIGI_SKU||SKU);return html(successPage(paid,paid?s.id:""))}catch{return html(successPage(false,""))}}
function successPage(paid,id){const safe=String(id||"").replace(/[^A-Za-z0-9_]/g,"").slice(0,80);return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101411"><title>${paid?"Your night is yours":"Checkout not confirmed"} · Night Atlas</title><style>body{margin:0;background:#101411;color:#f2f0e8;font:15px system-ui;display:grid;min-height:100vh;place-items:center;text-align:center}.card{max-width:520px;padding:38px}.mark{font-size:40px;color:#c4f27a}h1{font:48px Georgia;margin:15px 0}p{color:#b4bcb0;line-height:1.7}a{color:#c4f27a}</style></head><body><main class="card"><div class="mark">${paid?"✳":"↺"}</div><h1>${paid?"The night is yours.":"Checkout not confirmed."}</h1><p>${paid?"Stripe confirmed your payment. Your custom constellation tee is queued for print; Prodigi receives the order through our signed payment webhook.":"We couldn’t confirm a completed payment for this checkout link. Return to the store to try again."}</p>${paid?`<p style="font:10px monospace;color:#778074">ORDER SESSION ${safe}</p>`:""}<a href="/">Return to Night Atlas</a></main></body></html>`}

// Stream a transparent 4680 × 5790 RGBA PNG so the DTG artwork stays print-ready
// without holding the full 108 MB raw image in Worker memory.
async function createPrintPng(p) {
  const w=4680,h=5790,{stars,chain,cx,cy,r}=sky(p),pal=palette(p.color),ink=rgb(pal.ink),ivory=rgb(pal.highlight);
  const strokes=[];for(let i=0;i<chain.length-1;i++)strokes.push({a:chain[i],b:chain[i+1],width:5,color:ink});
  const circles=[{x:cx,y:cy,r,width:4,color:ink,ring:true},{x:cx,y:cy,r:r+90,width:2,color:ink,ring:true}];
  for(let i=0;i<48;i++){const a=i*Math.PI/24,inner=r-(i%4===0?45:19);strokes.push({a:{x:cx+Math.cos(a)*inner,y:cy+Math.sin(a)*inner},b:{x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r},width:i%4===0?5:3,color:ink})}
  for(const s of stars)circles.push({x:s.x,y:s.y,r:s.r,width:0,color:s.bright?ivory:ink});
  const glyphs=glyphMap();const texts=[];
  addText(texts,"NIGHT ATLAS / PERSONAL SKY NO. 01",2340,880,13,ink);
  addText(texts,titleCase(p.name),2340,4410,31,ink);
  addText(texts,titleCase(p.place),2340,4695,13,ink);
  addText(texts,`${p.date.split('-').reverse().join(' · ')} / ${titleCase(p.place)}`,2340,4950,11,ink);
  const enc=new CompressionStream("deflate"),writer=enc.writable.getWriter(),chunks=[];const reader=enc.readable.getReader();const pump=(async()=>{for(;;){const q=await reader.read();if(q.done)break;chunks.push(q.value)}})();
  for(let y=0;y<h;y++){
    const row=new Uint8Array(1+w*4);row[0]=0;
    for(const s of strokes){if(y<Math.min(s.a.y,s.b.y)-s.width||y>Math.max(s.a.y,s.b.y)+s.width)continue;const dy=s.b.y-s.a.y,t=Math.abs(dy)<.001?0:Math.max(0,Math.min(1,(y-s.a.y)/dy)),x=s.a.x+(s.b.x-s.a.x)*t;span(row,Math.round(x-s.width/2),Math.round(x+s.width/2),s.color,w)}
    for(const c of circles){if(c.ring){if(Math.abs(y-c.y)>c.r+c.width)continue;const outer=Math.sqrt(Math.max(0,(c.r+c.width/2)**2-(y-c.y)**2)),inner=Math.sqrt(Math.max(0,(c.r-c.width/2)**2-(y-c.y)**2));span(row,c.x-outer,c.x-inner,c.color,w);span(row,c.x+inner,c.x+outer,c.color,w)}else{const dy=y-c.y;if(Math.abs(dy)>c.r)continue;const dx=Math.sqrt(c.r*c.r-dy*dy);span(row,c.x-dx,c.x+dx,c.color,w)}}
    for(const t of texts){if(y<t.y||y>=t.y+t.scale*7)continue;const gy=Math.floor((y-t.y)/t.scale),glyphsline=t.glyphs;for(let i=0;i<glyphsline.length;i++){const bits=glyphsline[i][gy];for(let gx=0;gx<5;gx++)if(bits&(1<<(4-gx))){const x=t.x+i*6*t.scale+gx*t.scale;span(row,x,x+t.scale,t.color,w)}}}
    await writer.write(row);
  }
  await writer.close();await pump;const compressed=join(chunks);const ihdr=new Uint8Array(13);put32(ihdr,0,w);put32(ihdr,4,h);ihdr.set([8,6,0,0,0],8);return join([new Uint8Array([137,80,78,71,13,10,26,10]),pngChunk("IHDR",ihdr),pngChunk("IDAT",compressed),pngChunk("IEND",new Uint8Array())]);
  function addText(list,text,center,y,scale,color){const glyphsline=Array.from(text.toUpperCase()).map(c=>glyphMap()[c]||glyphMap()[" "]);const width=glyphsline.length*6*scale;list.push({glyphs:glyphsline,x:Math.round(center-width/2),y,scale,color})}
}
function span(row,x1,x2,color,w){x1=Math.max(0,Math.ceil(x1));x2=Math.min(w-1,Math.floor(x2));for(let x=x1;x<=x2;x++){const p=1+x*4;row[p]=color[0];row[p+1]=color[1];row[p+2]=color[2];row[p+3]=color[3]}}
function rgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255]}
function put32(b,o,n){b[o]=(n>>>24)&255;b[o+1]=(n>>>16)&255;b[o+2]=(n>>>8)&255;b[o+3]=n&255}
function join(parts){const n=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
function pngChunk(name,data){const type=new TextEncoder().encode(name),out=new Uint8Array(data.length+12);put32(out,0,data.length);out.set(type,4);out.set(data,8);put32(out,data.length+8,crc32(out.subarray(4,data.length+8)));return out}
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function addText(list,text,center,y,scale,color){const map=glyphMap(),glyphs=Array.from(text.toUpperCase()).map(c=>map[c]||map[" "]);const width=glyphs.length*6*scale;list.push({glyphs,x:Math.round(center-width/2),y,scale,color})}
function glyphMap(){return {" ":[0,0,0,0,0,0,0],"A":[14,17,17,31,17,17,17],"B":[30,17,17,30,17,17,30],"C":[14,17,16,16,16,17,14],"D":[30,17,17,17,17,17,30],"E":[31,16,16,30,16,16,31],"F":[31,16,16,30,16,16,16],"G":[14,17,16,23,17,17,15],"H":[17,17,17,31,17,17,17],"I":[14,4,4,4,4,4,14],"J":[7,2,2,2,18,18,12],"K":[17,18,20,24,20,18,17],"L":[16,16,16,16,16,16,31],"M":[17,27,21,21,17,17,17],"N":[17,25,21,19,17,17,17],"O":[14,17,17,17,17,17,14],"P":[30,17,17,30,16,16,16],"Q":[14,17,17,17,21,18,13],"R":[30,17,17,30,20,18,17],"S":[15,16,16,14,1,1,30],"T":[31,4,4,4,4,4,4],"U":[17,17,17,17,17,17,14],"V":[17,17,17,17,17,10,4],"W":[17,17,17,21,21,21,10],"X":[17,17,10,4,10,17,17],"Y":[17,17,10,4,4,4,4],"Z":[31,1,2,4,8,16,31],"0":[14,17,19,21,25,17,14],"1":[4,12,4,4,4,4,14],"2":[14,17,1,2,4,8,31],"3":[30,1,1,14,1,1,30],"4":[2,6,10,18,31,2,2],"5":[31,16,16,30,1,1,30],"6":[14,16,16,30,17,17,14],"7":[31,1,2,4,8,8,8],"8":[14,17,17,14,17,17,14],"9":[14,17,17,15,1,1,14],".":[0,0,0,0,0,12,12],",":[0,0,0,0,4,4,8],"/":[1,2,2,4,8,8,16],"- ":[0,0,0,31,0,0,0],"- ":[0,0,0,31,0,0,0],"- ":[0,0,0,31,0,0,0],"-":[0,0,0,31,0,0,0],"·":[0,0,0,4,0,0,0],":":[0,12,12,0,12,12,0]};}
