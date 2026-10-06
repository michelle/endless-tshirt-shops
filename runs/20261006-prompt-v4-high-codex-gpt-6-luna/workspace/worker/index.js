const page = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f5f2eb">
  <title>Field Notes — a sky that’s yours</title>
  <meta name="description" content="A one-of-one star map, drawn for your place and date. Made to order on a soft, responsibly sourced tee.">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
    :root{--paper:#f5f2eb;--ink:#222a27;--muted:#737972;--line:#dcd9d0;--green:#354b40;--clay:#b96649;--mono:'DM Mono',monospace;--sans:'DM Sans',sans-serif;--serif:'Playfair Display',serif}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased}a{color:inherit}button,input,select{font:inherit}button{cursor:pointer}.announcement{padding:9px 16px;text-align:center;background:#31473d;color:#eff0e8;font:10px var(--mono);letter-spacing:.11em;text-transform:uppercase}.nav{height:76px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 max(5vw,22px)}.brand{font:600 20px var(--serif);letter-spacing:.01em}.brand span{color:var(--clay)}.navlink{font:10px var(--mono);letter-spacing:.11em;text-transform:uppercase;text-decoration:none}.hero{max-width:1240px;margin:0 auto;padding:52px 34px 88px;display:grid;grid-template-columns:1fr 1.08fr;gap:66px;align-items:center}.kicker{font:10px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--clay);margin:0 0 19px}.headline{font:500 clamp(42px,5.2vw,70px)/1.04 var(--serif);letter-spacing:-.035em;margin:0 0 22px;max-width:550px}.intro{font-size:15px;line-height:1.75;color:#606862;max-width:465px;margin:0 0 27px}.micro{font:10px var(--mono);text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}.steps{display:flex;gap:22px;padding:0;margin:0 0 30px;list-style:none}.steps li{font:10px var(--mono);letter-spacing:.07em;color:#647068;text-transform:uppercase}.steps b{color:var(--clay);margin-right:7px}.builder{border-top:1px solid var(--line);padding-top:25px}.field{margin:0 0 20px}.field label,.field-label{display:flex;align-items:center;justify-content:space-between;font:10px var(--mono);letter-spacing:.12em;text-transform:uppercase;margin-bottom:9px;color:#4e5851}.field input,.field select{width:100%;height:47px;border:1px solid #d1d0c7;background:#faf9f5;border-radius:0;padding:0 13px;color:var(--ink);outline:none}.field input:focus,.field select:focus{border-color:#596e61;box-shadow:0 0 0 2px #596e6120}.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}.color-picker{display:flex;gap:10px}.swatch{display:flex;align-items:center;gap:7px;font:10px var(--mono);text-transform:capitalize;cursor:pointer}.swatch input{position:absolute;opacity:0}.swatch i{width:19px;height:19px;border-radius:50%;border:1px solid #b8b8ad;display:block}.swatch input:checked+i{outline:1px solid var(--ink);outline-offset:3px}.size-row{display:flex;gap:7px}.size-row label{position:relative}.size-row input{position:absolute;opacity:0}.size-row span{display:grid;place-items:center;width:42px;height:40px;border:1px solid #d1d0c7;background:#faf9f5;font:10px var(--mono)}.size-row input:checked+span{background:var(--green);border-color:var(--green);color:white}.price-line{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--line);padding:17px 0 14px;margin-top:24px}.price{font:24px var(--serif)}.price small{font:10px var(--mono);color:var(--muted)}.buy{width:100%;height:54px;background:var(--green);border:0;color:#fff;font:10px var(--mono);letter-spacing:.14em;text-transform:uppercase;transition:background .2s}.buy:hover{background:#24382e}.buy:disabled{opacity:.56;cursor:wait}.fineprint{font:10px/1.65 var(--mono);color:var(--muted);text-align:center;margin:11px 0 0}.status{min-height:20px;font:11px var(--mono);color:var(--clay);text-align:center;margin-top:8px}
    .visual{position:relative;min-height:648px;background:#dedfd3;overflow:hidden;display:grid;place-items:center}.visual:before{content:"";position:absolute;width:68%;height:68%;border:1px solid #aab2a5;border-radius:50%;opacity:.55}.visual:after{content:"";position:absolute;width:52%;height:52%;border:1px solid #aab2a5;border-radius:50%;opacity:.35}.orbital{position:absolute;width:92%;height:92%;border:1px solid #aab2a5;border-radius:50%;opacity:.22}.visual-tag{position:absolute;z-index:5;top:21px;left:23px;font:9px var(--mono);letter-spacing:.15em;text-transform:uppercase;color:#59645c}.preview-wrap{position:relative;z-index:2;width:82%;max-width:500px;filter:drop-shadow(0 22px 24px #25362d26)}.shirt{position:relative;clip-path:polygon(26% 4%,39% 0,50% 3%,61% 0,74% 4%,98% 21%,83% 40%,74% 33%,74% 100%,26% 100%,26% 33%,17% 40%,2% 21%);width:100%;aspect-ratio:.84;background:#23332d;transition:background .2s}.shirt:before{content:"";position:absolute;top:1%;left:41%;width:18%;height:10%;border:2px solid #f5f2eb50;border-top:0;border-radius:0 0 50% 50%}.shirt-art{position:absolute;top:19%;left:16%;width:68%;height:69%;object-fit:contain}.shirt-note{position:absolute;bottom:25px;z-index:3;background:#f5f2ebd9;padding:11px 16px;font:9px var(--mono);letter-spacing:.13em;text-transform:uppercase;color:#415249}.preview-caption{position:absolute;right:21px;bottom:20px;font:9px var(--mono);letter-spacing:.1em;color:#59645c}.ticker{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:18px;display:flex;justify-content:center;gap:34px;flex-wrap:wrap;font:9px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:#627067}.ticker span:before{content:'✳';margin-right:10px;color:var(--clay)}.story{max-width:980px;margin:0 auto;padding:94px 25px 105px;text-align:center}.story h2{font:500 38px/1.15 var(--serif);margin:12px auto 17px;max-width:590px}.story p{max-width:590px;margin:auto;font-size:14px;line-height:1.8;color:#667068}.story-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:34px;margin-top:56px;text-align:left}.story-grid h3{font:500 18px var(--serif);margin:13px 0 8px}.story-grid p{font-size:12px;line-height:1.7}.story-icon{height:80px;border:1px solid var(--line);display:grid;place-items:center;font:27px var(--serif);color:var(--clay)}footer{border-top:1px solid var(--line);padding:25px max(5vw,22px);display:flex;justify-content:space-between;font:9px var(--mono);color:var(--muted);letter-spacing:.05em}
    @media(max-width:820px){.hero{grid-template-columns:1fr;gap:38px;padding:38px 22px 62px}.visual{grid-row:1;min-height:500px}.headline{font-size:55px}.visual-tag{top:15px;left:15px}.steps{gap:13px}.story{padding:68px 22px}.story-grid{gap:18px}}@media(max-width:550px){.visual{min-height:390px}.headline{font-size:48px}.steps{justify-content:space-between}.steps li{font-size:8px}.story-grid{grid-template-columns:1fr;gap:25px}.story-icon{height:58px}footer{gap:10px;flex-direction:column}.pair{gap:9px}}
  </style>
</head>
<body>
  <div class="announcement">Every shirt is one of one · Printed to order</div>
  <nav class="nav"><a class="brand" href="#top" style="text-decoration:none">field<span>/</span>notes</a><a class="navlink" href="#story">Our process&nbsp; ↗</a></nav>
  <main id="top">
    <section class="hero">
      <div class="copy">
        <p class="kicker">A little piece of your universe</p>
        <h1 class="headline">The sky looked like this, <em>for you.</em></h1>
        <p class="intro">A quiet constellation chart, composed from your place and date. A soft, heavyweight tee with a story only you can wear.</p>
        <ol class="steps"><li><b>01</b>Choose a moment</li><li><b>02</b>Make it yours</li><li><b>03</b>We print it</li></ol>
        <form class="builder" id="orderForm">
          <div class="field"><label for="place">Where were you?</label><input id="place" name="place" maxlength="30" value="Big Sur, California" autocomplete="off" required><span class="micro">A city, a coastline, anywhere</span></div>
          <div class="pair"><div class="field"><label for="date">When was it?</label><input id="date" name="date" type="date" value="2024-08-12" required></div><div class="field"><label for="tone">Ink tone</label><select id="tone"><option value="classic">Warm ivory</option><option value="copper">Desert copper</option><option value="celestial">Moonlit blue</option></select></div></div>
          <div class="field"><span class="field-label">Shirt color</span><div class="color-picker">
            <label class="swatch"><input type="radio" name="color" value="black" checked><i style="background:#222927"></i>Black</label>
            <label class="swatch"><input type="radio" name="color" value="natural"><i style="background:#dfd6c5"></i>Natural</label>
            <label class="swatch"><input type="radio" name="color" value="military green"><i style="background:#67715b"></i>Sage</label>
            <label class="swatch"><input type="radio" name="color" value="navy blue"><i style="background:#28374a"></i>Navy</label>
          </div></div>
          <div class="field"><span class="field-label">Your fit <span class="micro">Unisex · Bella+Canvas 3001</span></span><div class="size-row">
            <label><input type="radio" name="size" value="s"><span>S</span></label><label><input type="radio" name="size" value="m" checked><span>M</span></label><label><input type="radio" name="size" value="l"><span>L</span></label><label><input type="radio" name="size" value="xl"><span>XL</span></label><label><input type="radio" name="size" value="2xl"><span>2XL</span></label><label><input type="radio" name="size" value="3xl"><span>3XL</span></label>
          </div></div>
          <div class="price-line"><span class="micro">Made just for you · free US shipping</span><span class="price">$34 <small>USD</small></span></div>
          <button class="buy" id="buy" type="submit">Create my star map&nbsp;&nbsp; →</button>
          <p class="fineprint">Secure checkout · Ships in 5–8 business days<br>Printed in water-based ink on a premium cotton tee</p>
          <div class="status" id="status" role="status" aria-live="polite"></div>
        </form>
      </div>
  <div class="visual"><span class="visual-tag">your moment · chart no. <span id="chartNo">08—12</span></span><div class="orbital"></div><div class="preview-wrap"><div class="shirt" id="shirt"><canvas class="shirt-art" id="preview" width="520" height="640" aria-label="Preview of the personalized constellation shirt"></canvas></div></div><span class="shirt-note">A sky of your own</span><span class="preview-caption">Print preview · front</span></div>
    </section>
    <div class="ticker"><span>100% cotton</span><span>Drawn for your moment</span><span>Printed only when ordered</span><span>Made with care</span></div>
    <section class="story" id="story"><p class="kicker">Made slowly, worn often</p><h2>More than a date. A place to return to.</h2><p>We turn a memory into a little sky of its own. Each chart gets a unique arrangement of stars, your chosen coordinates and date, then is printed just for you on a soft, durable cotton tee.</p><div class="story-grid"><article><div class="story-icon">✳</div><h3>Your place, your pattern</h3><p>Share any place and date. We compose a one-off constellation map around your moment.</p></article><article><div class="story-icon">◌</div><h3>Considered materials</h3><p>Premium Airlume cotton with a comfortable unisex fit. Printed with water-based inks.</p></article><article><div class="story-icon">✦</div><h3>Made when you order</h3><p>No piles of unsold stock. Your personalized tee is printed and shipped with care.</p></article></div></section>
  </main>
  <footer><span>© 2026 FIELD NOTES STUDIO</span><span>One sky, one story, one shirt.</span><span>Printed in partnership with Prodigi</span></footer>
<script>
  const placeInput=document.querySelector('#place'), dateInput=document.querySelector('#date'), toneInput=document.querySelector('#tone'), preview=document.querySelector('#preview'), shirt=document.querySelector('#shirt'), statusBox=document.querySelector('#status'), buyButton=document.querySelector('#buy');
  const colors={black:'#222927',natural:'#ded6c5','military green':'#67715b','navy blue':'#28374a'};
  const palettes={classic:['#f2ead9','#c6815e'],copper:['#efc39e','#d38c63'],celestial:['#d7e5ee','#81a8bd']};
  const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
  function selected(name){return document.querySelector('input[name="'+name+'"]:checked').value}
  function draw(c,w,h,data){const seed=hash(data.place+'|'+data.date),random=rng(seed);let [ink,accent]=palettes[data.tone];if(data.color==='natural'){const p=data.tone==='copper'?['#70472f','#a95e43']:data.tone==='celestial'?['#35485b','#687f91']:['#35433b','#a85f45'];ink=p[0];accent=p[1]}c.clearRect(0,0,w,h);c.lineCap='round';c.textAlign='center';const cx=w/2,cy=h*.385,r=w*.245;
    c.strokeStyle=ink;c.globalAlpha=.63;c.lineWidth=w*.002; c.beginPath();c.arc(cx,cy,r*1.12,0,Math.PI*2);c.stroke();c.globalAlpha=.32;c.beginPath();c.arc(cx,cy,r*1.29,0,Math.PI*2);c.stroke();c.globalAlpha=.7;c.beginPath();c.arc(cx,cy,r*.74,Math.PI*1.08,Math.PI*1.86);c.stroke();c.globalAlpha=1;
    const points=[];const n=18;for(let i=0;i<n;i++){let a=(Math.PI*2*i/n)+(.16+random()*.11),rr=r*(.4+random()*.52);points.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr])}
    c.globalAlpha=.45;c.strokeStyle=ink;c.lineWidth=w*.00125;for(let i=0;i<points.length;i++){const next=points[(i+(i%4===0?2:1))%points.length];c.beginPath();c.moveTo(...points[i]);c.lineTo(...next);c.stroke()}c.globalAlpha=1;
    for(let i=0;i<points.length;i++){let [x,y]=points[i],big=i%5===0,sz=w*(big?.008:.0045);c.fillStyle=i%6===0?accent:ink;c.beginPath();c.arc(x,y,sz,0,Math.PI*2);c.fill();if(big){c.strokeStyle=ink;c.globalAlpha=.5;c.lineWidth=w*.0015;c.beginPath();c.moveTo(x-w*.016,y);c.lineTo(x+w*.016,y);c.moveTo(x,y-w*.016);c.lineTo(x,y+w*.016);c.stroke();c.globalAlpha=1}}
    // A fine compass mark and tiny celestial bearings keep the print airy at garment scale.
    c.strokeStyle=accent;c.lineWidth=w*.002;c.beginPath();c.moveTo(cx,cy-r*1.52);c.lineTo(cx,cy-r*1.39);c.moveTo(cx-r*1.46,cy);c.lineTo(cx-r*1.34,cy);c.moveTo(cx+r*1.34,cy);c.lineTo(cx+r*1.46,cy);c.stroke();
    const scale=w/520;c.fillStyle=ink;c.font='500 '+(11*scale)+'px monospace';c.letterSpacing=(2*scale)+'px';c.fillText('FIELD NOTE  /  '+String(seed).slice(-4).padStart(4,'0'),cx,cy+r*1.57);c.fillStyle=accent;c.font='500 '+(17*scale)+'px Georgia, serif';c.letterSpacing=(1*scale)+'px';c.fillText(data.place.toUpperCase().slice(0,25),cx,cy+r*1.87);c.fillStyle=ink;c.font=(10*scale)+'px monospace';c.letterSpacing=(2*scale)+'px';c.fillText(new Date(data.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'}).toUpperCase(),cx,cy+r*2.13);
    c.globalAlpha=.56;c.strokeStyle=ink;c.lineWidth=w*.0015;c.beginPath();c.moveTo(cx-r*.72,cy+r*2.25);c.lineTo(cx+r*.72,cy+r*2.25);c.stroke();c.globalAlpha=1;
  }
  function data(){return {place:placeInput.value.trim()||'Somewhere special',date:dateInput.value,tone:toneInput.value,color:selected('color'),size:selected('size')}}
  function refresh(){const d=data();shirt.style.background=colors[d.color];draw(preview.getContext('2d'),preview.width,preview.height,d);document.querySelector('#chartNo').textContent=d.date.slice(5).replace('-','—')}
  dateInput.max=new Date().toISOString().slice(0,10);document.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',refresh));placeInput.addEventListener('change',refresh);refresh();
  const query=new URLSearchParams(location.search);if(query.get('success')==='1'){buyButton.disabled=true;statusBox.textContent='Thank you — checking your payment and print order…';(async()=>{for(let i=0;i<8;i++){try{const r=await fetch('/api/order-status?session_id='+encodeURIComponent(query.get('session_id')||''));const s=await r.json();if(s.paid&&s.ordered){statusBox.textContent='Your payment is in, and your star map is queued for print. Thank you!';buyButton.disabled=false;return}if(!s.paid)break}catch{}await new Promise(r=>setTimeout(r,1600))}statusBox.textContent='Your payment is processing. We’ll send an order update by email shortly.';buyButton.disabled=false})()}else if(query.get('cancelled')==='1'){statusBox.textContent='Checkout was cancelled. Your design is still here whenever you’re ready.';history.replaceState({},'',location.pathname)}
  document.querySelector('#orderForm').addEventListener('submit',async e=>{e.preventDefault();if(!dateInput.value||!placeInput.value.trim())return;buyButton.disabled=true;statusBox.textContent='Composing your print file…';try{const d=data(),printCanvas=document.createElement('canvas');printCanvas.width=4680;printCanvas.height=5790;draw(printCanvas.getContext('2d'),4680,5790,d);const png=await new Promise(resolve=>printCanvas.toBlob(resolve,'image/png'));if(!png)throw new Error('Could not prepare artwork. Please try again.');const form=new FormData();form.append('artwork',png,'field-notes.png');form.append('design',JSON.stringify(d));statusBox.textContent='Opening secure checkout…';const response=await fetch('/api/checkout',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error||'Checkout could not start. Please try again.');window.location.assign(result.url)}catch(error){statusBox.textContent=error.message;buyButton.disabled=false}});
</script>
</body>
</html>`;

const encoder = new TextEncoder();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const safeText = (value, max) => String(value || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);
const constantTimeEqual = (a, b) => { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; };
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");

async function verifyStripeSignature(raw, header, secret) {
  const parts = Object.fromEntries(header.split(",").map(x => x.split("=")).filter(x => x.length === 2));
  if (!parts.t || !parts.v1 || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${parts.t}.${raw}`)));
  return parts.v1.split(" ").some(v => constantTimeEqual(v, digest));
}

async function stripeRequest(env, path, params) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { method: "POST", headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Stripe request failed");
  return body;
}

async function stripeGet(env, path) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Stripe request failed");
  return body;
}

async function checkout(request, env) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) return json({ error: "Secure checkout is being configured. Please check back soon." }, 503);
  if (!env.BUCKET || !env.PRODIGI_API_KEY) return json({ error: "The print service is not configured yet." }, 503);
  const form = await request.formData();
  const image = form.get("artwork"), rawDesign = form.get("design");
  if (!(image instanceof File) || image.type !== "image/png" || image.size > 2_000_000 || typeof rawDesign !== "string" || rawDesign.length > 400) return json({ error: "Please refresh the page and try your design again." }, 400);
  let supplied;
  try { supplied = JSON.parse(rawDesign); } catch { return json({ error: "The design details were not valid." }, 400); }
  const design = { place: safeText(supplied.place, 30), date: /^\d{4}-\d{2}-\d{2}$/.test(supplied.date) ? supplied.date : "", tone: ["classic", "copper", "celestial"].includes(supplied.tone) ? supplied.tone : "classic", color: ["black", "natural", "military green", "navy blue"].includes(supplied.color) ? supplied.color : "black", size: ["s", "m", "l", "xl", "2xl", "3xl"].includes(supplied.size) ? supplied.size : "m" };
  if (!design.place || !design.date || design.date > new Date().toISOString().slice(0, 10)) return json({ error: "Add a place and a date in the past to continue." }, 400);
  const id = crypto.randomUUID();
  const png = await image.arrayBuffer();
  await env.BUCKET.put(`orders/${id}/artwork.png`, png, { httpMetadata: { contentType: "image/png", cacheControl: "private, max-age=0" } });
  await env.BUCKET.put(`orders/${id}/draft.json`, JSON.stringify({ id, design, createdAt: new Date().toISOString() }), { httpMetadata: { contentType: "application/json" } });
  const base = new URL(request.url).origin;
  try {
    const session = await stripeRequest(env, "checkout/sessions", {
      mode: "payment", success_url: `${base}/?success=1&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${base}/?cancelled=1`,
      "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "usd", "line_items[0][price_data][unit_amount]": "3400", "line_items[0][price_data][product_data][name]": "Your Field Notes Star Map Tee", "line_items[0][price_data][product_data][description]": `${design.place} · ${design.date} · ${design.size.toUpperCase()} · ${design.color}`,
      "shipping_address_collection[allowed_countries][0]": "US", "shipping_options[0][shipping_rate_data][type]": "fixed_amount", "shipping_options[0][shipping_rate_data][fixed_amount][amount]": "0", "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "usd", "shipping_options[0][shipping_rate_data][display_name]": "Free US shipping",
      "phone_number_collection[enabled]": "true", "billing_address_collection": "auto", "metadata[order_id]": id, "metadata[shirt_sku]": "GLOBAL-TEE-BC-3001", "metadata[shirt_size]": design.size, "metadata[shirt_color]": design.color,
    });
    if (!session.url) throw new Error("Checkout session had no redirect URL");
    await env.BUCKET.put(`orders/${id}/session.json`, JSON.stringify({ id: session.id, url: session.url, createdAt: new Date().toISOString() }), { httpMetadata: { contentType: "application/json" } });
    return json({ url: session.url });
  } catch (error) {
    await env.BUCKET.delete([`orders/${id}/artwork.png`, `orders/${id}/draft.json`]);
    return json({ error: error.message || "Secure checkout is temporarily unavailable." }, 502);
  }
}

function stripeAddress(session) {
  const detail = session.shipping_details || session.customer_details;
  const a = detail?.address || {};
  const required = [detail?.name, a.line1, a.city, a.postal_code, a.country];
  if (required.some(x => !x)) return null;
  return { name: safeText(detail.name, 100), email: safeText(session.customer_details?.email, 150), phoneNumber: safeText(session.customer_details?.phone, 40), address: { line1: safeText(a.line1, 100), line2: safeText(a.line2, 100), townOrCity: safeText(a.city, 100), stateOrCounty: safeText(a.state, 100), postalOrZipCode: safeText(a.postal_code, 30), countryCode: safeText(a.country, 2).toUpperCase() } };
}

async function createProdigiOrder(session, env, origin) {
  if (session.payment_status !== "paid") return;
  const orderId = session.metadata?.order_id;
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("Missing internal order reference");
  const keys = [`orders/${orderId}/draft.json`, `orders/${orderId}/artwork.png`, `orders/${orderId}/prodigi.json`];
  const [draftObj, image, existing] = await Promise.all(keys.map(k => env.BUCKET.get(k)));
  if (!draftObj || !image) throw new Error("Paid design file is unavailable");
  if (existing) return;
  const draft = await draftObj.json();
  const recipient = stripeAddress(session);
  if (!recipient) throw new Error("Paid checkout is missing a complete shipping address");
  const attributes = { brand: "Bella + Canvas", edge: "Crew neck", color: session.metadata.shirt_color, gender: "Unisex", paperType: "100% cotton", size: session.metadata.shirt_size, style: "3001" };
  const payload = { merchantReference: `FN-${orderId.slice(0, 12)}`, idempotencyKey: `fn-${orderId}`, shippingMethod: "Standard", recipient, items: [{ merchantReference: `Star map · ${draft.design.place}`, sku: "GLOBAL-TEE-BC-3001", copies: 1, sizing: "fitPrintArea", attributes, assets: [{ printArea: "front", url: `${origin}/print/${orderId}.png` }], recipientCost: { amount: "34.00", currency: "USD" } }], metadata: { store: "Field Notes", design: draft.design, stripeSession: session.id } };
  const response = await fetch("https://api.sandbox.prodigi.com/v4.0/Orders", { method: "POST", headers: { "X-API-Key": env.PRODIGI_API_KEY, "content-type": "application/json" }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok || !result.order?.id) throw new Error(`Prodigi order failed (${response.status}): ${JSON.stringify(result).slice(0, 500)}`);
  await env.BUCKET.put(`orders/${orderId}/prodigi.json`, JSON.stringify({ id: result.order.id, status: result.order.status, createdAt: new Date().toISOString() }), { httpMetadata: { contentType: "application/json" } });
}

async function webhook(request, env, origin) {
  const raw = await request.text(), signature = request.headers.get("stripe-signature") || "";
  if (!await verifyStripeSignature(raw, signature, env.STRIPE_WEBHOOK_SECRET || "")) return json({ error: "Invalid signature" }, 400);
  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data?.object;
    if (session?.payment_status === "paid") {
      try { await createProdigiOrder(session, env, origin); } catch (error) { console.error("Paid order handoff failed", session.id, error.message); return json({ error: "Fulfillment will retry" }, 500); }
    }
  }
  return json({ received: true });
}

async function printAsset(request, env) {
  const id = new URL(request.url).pathname.match(/^\/print\/([0-9a-f-]{36})\.png$/i)?.[1];
  if (!id) return new Response("Not found", { status: 404 });
  const obj = await env.BUCKET.get(`orders/${id}/artwork.png`);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
}

async function orderStatus(request, env) {
  const sessionId = new URL(request.url).searchParams.get("session_id") || "";
  if (!env.STRIPE_SECRET_KEY || !env.BUCKET || !/^cs_(test|live)_[a-zA-Z0-9_]+$/.test(sessionId)) return json({ paid: false, ordered: false }, 400);
  try {
    const session = await stripeGet(env, `checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (session.payment_status !== "paid" || !session.metadata?.order_id) return json({ paid: false, ordered: false });
    const result = await env.BUCKET.get(`orders/${session.metadata.order_id}/prodigi.json`);
    return json({ paid: true, ordered: !!result });
  } catch { return json({ paid: false, ordered: false }, 502); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response(page, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'" } });
    if (request.method === "POST" && url.pathname === "/api/checkout") return checkout(request, env);
    if (request.method === "POST" && url.pathname === "/api/stripe-webhook") return webhook(request, env, url.origin);
    if (request.method === "GET" && url.pathname === "/api/order-status") return orderStatus(request, env);
    if (request.method === "GET" && url.pathname.startsWith("/print/")) return printAsset(request, env);
    return new Response("Not found", { status: 404 });
  }
};
