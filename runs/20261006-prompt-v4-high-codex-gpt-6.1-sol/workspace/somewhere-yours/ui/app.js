'use strict';
const $=selector=>document.querySelector(selector);
const $$=selector=>Array.from(document.querySelectorAll(selector));
const presets={
 'big-sur':{place:'BIG SUR',caption:'WHERE I FEEL MOST ALIVE',lat:36.2704,lon:-121.8081,date:'2024-08-17',color:'black',size:'m',palette:'tide'},
 'joshua-tree':{place:'JOSHUA TREE',caption:'THE DAYS WE GOT LOST',lat:34.1347,lon:-116.3131,date:'2025-04-12',color:'natural',size:'m',palette:'ember'},
 'new-york':{place:'NEW YORK',caption:'THERE IS NO PLACE LIKE HOME',lat:40.7128,lon:-74.006,date:'2023-09-02',color:'white',size:'m',palette:'blue'}
};
const palettes={tide:['#edaa82','#8da994','#b4c5a0'],ember:['#c76536','#b08842','#d7a551'],blue:['#3855a6','#63899b','#8db9c2']};
let state={...presets['big-sur']},configuration=null,requestId=crypto.randomUUID();
function coords(d){return Math.abs(d.lat).toFixed(4)+'° '+(d.lat<0?'S':'N')+' / '+Math.abs(d.lon).toFixed(4)+'° '+(d.lon<0?'W':'E');}
function hash(text){let n=2166136261;for(let i=0;i<text.length;i++){n^=text.charCodeAt(i);n=Math.imul(n,16777619);}return (n>>>0)/4294967295;}
function drawDesign(canvas,d,w=1000,h=1257){
 canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.scale(w/1000,h/1257);ctx.clearRect(0,0,1000,1257);
 const p=[...palettes[d.palette]],ink=d.color==='black'?'#ede8d9':'#273e36';
 if(d.color!=='black'){const tones={tide:['#426858','#66834e'],ember:['#8d693c','#a77a34'],blue:['#446b80','#4d818b']}[d.palette];p[1]=tones[0];p[2]=tones[1];}
 const seed=hash(d.place+'|'+d.lat+'|'+d.lon+'|'+d.date),phase=seed*Math.PI*2;
 function text(value,y,size,font='Georgia',color=ink){ctx.fillStyle=color;ctx.textAlign='center';ctx.font=(font==='Arial'?'500 ':'')+size+'px '+font;ctx.fillText(value,500,y,800);}
 ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(120,133);ctx.lineTo(880,133);ctx.stroke();
 text('S O M E W H E R E   Y O U R S',110,17,'Arial');
 const title=d.place.toUpperCase();ctx.font='77px Georgia';const titleWidth=ctx.measureText(title).width;text(title,235,Math.min(77,77*780/Math.max(1,titleWidth)));
 const cx=500,cy=580,r=310;
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
 // A full-color sunset and fine contour lines with plenty of garment showing through.
 const sunX=500+Math.sin(phase)*76,sunY=446+Math.cos(phase)*23;
 ctx.fillStyle=p[0];ctx.beginPath();ctx.arc(sunX,sunY,110+seed*18,0,Math.PI*2);ctx.fill();
 for(let i=0;i<7;i++){ctx.clearRect(190,sunY+30+i*13,620,3+i*.3);}
 ctx.fillStyle=ink;ctx.globalAlpha=.55;
 for(let i=0;i<24;i++){const a=i*2.39996+phase;const rr=125+(i*19)%180;ctx.beginPath();ctx.arc(500+Math.cos(a)*rr,480+Math.sin(a)*rr*.62,1.8,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 for(let i=0;i<34;i++){
  ctx.beginPath();ctx.strokeStyle=i<18?p[1]:p[2];ctx.lineWidth=i%6===0?4:2.7;
  for(let x=180;x<=820;x+=4){const nx=(x-500)/320;const y=565+i*11+Math.sin(nx*3.5+phase+i*.027)*35+Math.cos(nx*6.3-phase)*17+(Math.sin(nx*1.9+phase)*17)*(i/34);if(x===180)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
  ctx.stroke();
 }
 ctx.restore();
 ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r+13,-Math.PI*.89,-Math.PI*.13);ctx.stroke();
 // Compass crosshair and an individual field-print index.
 ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(490,585);ctx.lineTo(510,585);ctx.moveTo(500,575);ctx.lineTo(500,595);ctx.stroke();
 text(coords(d),966,23,'Arial');
 text(d.caption.toUpperCase(),1026,28,'Arial');
 const parsed=new Date(d.date+'T12:00:00Z');const date=isNaN(parsed.getTime())?d.date:parsed.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric',timeZone:'UTC'}).toUpperCase();
 text(date+'   ·   FIELD PRINT '+String(Math.floor(seed*9999)).padStart(4,'0'),1080,19,'Arial');
 ctx.beginPath();ctx.moveTo(120,1123);ctx.lineTo(880,1123);ctx.stroke();text('A   P L A C E   T O   K E E P',1161,15,'Arial');
 return canvas;
}
function shirt(container,d){
 const color={black:'#242826',natural:'#e8ddbd',white:'#f6f5ef'}[d.color],shade={black:'#121715',natural:'#beb395',white:'#d5d5cd'}[d.color];
 const key=container.id.replace(/[^a-z0-9]/g,'');
 container.innerHTML='<svg viewBox="0 0 600 684" aria-hidden="true"><defs><linearGradient id="fabric'+key+'" x1="0" y1="0" x2="1" y2=".1"><stop stop-color="'+shade+'"/><stop offset=".2" stop-color="'+color+'"/><stop offset=".52" stop-color="'+color+'"/><stop offset="1" stop-color="'+shade+'"/></linearGradient><linearGradient id="neck'+key+'" x2="0" y2="1"><stop stop-color="'+shade+'"/><stop offset="1" stop-color="'+color+'"/></linearGradient></defs><path d="M206 100 L239 85 Q300 104 361 85 L394 100 L500 157 L547 267 L459 304 L424 244 L426 570 Q300 589 174 570 L176 244 L141 304 L53 267 L100 157 Z" fill="url(#fabric'+key+')"/><path d="M239 85 Q300 145 361 85 Q351 154 300 155 Q249 154 239 85" fill="'+shade+'"/><path d="M248 93 Q300 121 352 93 Q343 144 300 144 Q257 144 248 93" fill="url(#neck'+key+')"/><path d="M208 105 Q178 160 177 244 M392 105 Q422 160 423 244 M60 261 L143 295 M540 261 L457 295 M176 561 Q300 579 424 561" fill="none" stroke="'+shade+'" stroke-width="2" opacity=".6"/><path d="M187 286 Q181 421 186 535 M413 284 Q418 415 411 542" fill="none" stroke="'+shade+'" stroke-width="3" opacity=".32"/><path d="M238 150 Q224 176 225 200 M362 150 Q375 180 374 200" fill="none" stroke="'+shade+'" stroke-width="2" opacity=".3"/></svg><canvas role="img" aria-label="Personalized '+d.place.replace(/[<>"']/g,'')+' shirt design"></canvas>';
 drawDesign(container.querySelector('canvas'),d,1000,1257);
}
function render(){
 shirt($('#studio-shirt'),state);$('#preview-color').textContent=state.color+' / '+state.palette;
 for(const key of ['palette','color','size'])for(const b of $$('[data-'+key+']'))b.setAttribute('aria-pressed',String(b.dataset[key]===state[key]));
 try{localStorage.setItem('somewhere-yours-design',JSON.stringify(state));}catch{}
}
function fillInputs(){for(const key of ['place','caption','lat','lon','date'])$('#'+key).value=state[key];render();}
function readInputs(){
 for(const key of ['place','caption','date'])state[key]=$('#'+key).value;
 for(const key of ['lat','lon']){const n=Number($('#'+key).value);state[key]=Number.isFinite(n)?n:0;}
 requestId=crypto.randomUUID();$('#approve').checked=false;render();
}
async function api(path,options){const r=await fetch(path,options);const data=await r.json();if(!r.ok)throw new Error(data.error||'Something went wrong.');return data;}
function printCanvas(){return drawDesign(document.createElement('canvas'),state,4677,5881);}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(let i=0;i<bytes.length;i++)crc=(crc>>>8)^crcTable[(crc^bytes[i])&255];return (crc^0xffffffff)>>>0;}
async function canvasBlob(canvas){
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not create your print file. Please try another browser.')),'image/png'));
 const bytes=new Uint8Array(await blob.arrayBuffer()),v=new DataView(bytes.buffer);let offset=8;const chunks=[bytes.slice(0,8)];
 while(offset<bytes.length){const n=v.getUint32(offset),type=String.fromCharCode(...bytes.slice(offset+4,offset+8));if(type!=='pHYs')chunks.push(bytes.slice(offset,offset+12+n));if(type==='IHDR'){
  const phys=new Uint8Array(21),pv=new DataView(phys.buffer);pv.setUint32(0,9);phys.set([112,72,89,115],4);pv.setUint32(8,11811);pv.setUint32(12,11811);phys[16]=1;pv.setUint32(17,crc32(phys.slice(4,17)));chunks.push(phys);
 }offset+=12+n;}
 return new Blob(chunks,{type:'image/png'});
}
async function base64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('Could not read your print file.'));reader.readAsDataURL(blob);});}
async function download(){
 const button=$('#download');for(const key of ['place','lat','lon','date','caption'])if(!$('#'+key).reportValidity())return;
 button.disabled=true;const before=button.textContent;button.textContent='Rendering your print…';
 try{const canvas=printCanvas(),blob=await canvasBlob(canvas),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='somewhere-yours-'+state.place.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);canvas.width=canvas.height=1;}catch(e){$('#checkout-error').textContent=e.message;}finally{button.disabled=false;button.textContent=before;}
}
async function checkout(event){
 event.preventDefault();const button=$('#checkout-button'),error=$('#checkout-error');error.textContent='';
 if(!configuration?.checkoutReady){error.textContent='Checkout is awaiting the store’s Stripe connection. Your design can still be downloaded.';return;}
 if(!$('#design-form').reportValidity())return;
 button.disabled=true;button.firstElementChild.textContent='Preparing your custom print…';
 try{
  const canvas=printCanvas(),blob=await canvasBlob(canvas),png=await base64(blob);canvas.width=canvas.height=1;
  const result=await api('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({design:{...state},png,requestId})});
  try{localStorage.setItem('somewhere-yours-last-order',JSON.stringify({id:result.orderId,token:result.orderToken}));}catch{}
  window.location.assign(result.url);
 }catch(e){error.textContent=e.message;button.disabled=false;button.firstElementChild.textContent='Continue to checkout';}
}
function setupDialogs(){
 for(const button of $$('[data-dialog]'))button.addEventListener('click',()=>$('#'+button.dataset.dialog).showModal());
 for(const dialog of $$('dialog')){dialog.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});}
}
let refreshing=false;
async function refreshOrder(){
 if(refreshing)return;refreshing=true;$('#refresh-order').disabled=true;$('#order-error').textContent='';
 const id=location.pathname.split('/')[2],token=new URLSearchParams(location.search).get('token'),base='/api/orders/'+id+'?token='+encodeURIComponent(token||'');
 try{
  let order=await api(base);
  if(['pending_payment','paid_fulfillment_error','submitting'].includes(order.status)){
   try{await api('/api/orders/'+id+'/reconcile?token='+encodeURIComponent(token||''),{method:'POST'});}catch(e){$('#order-error').textContent=e.message;}
   order=await api(base);
  }
  const submitted=['sandbox_submitted','submitted'].includes(order.status);
  $('#order-title').textContent=submitted?'Your somewhere is on its way.':order.status==='paid_fulfillment_error'?'Payment received. Print pending.':'Your order is saved.';
  $('#order-message').textContent=order.status==='sandbox_submitted'?'Your test payment succeeded and the order was accepted by Prodigi’s sandbox. No money was charged, and no shirt will be shipped.':order.status==='submitted'?'Payment confirmed. Your approved print has been sent to Prodigi for production.':order.status==='submitting'?'Payment confirmed. We’re submitting your artwork to the print provider. Refresh in a moment.':order.status==='paid_fulfillment_error'?'Your payment is recorded. The print service needs a retry; use Refresh order status.':'Payment has not yet been confirmed. Nothing has been sent to print.';
  const card=$('#order-card');card.replaceChildren();
  const badge=document.createElement('span');badge.className='order-status';badge.textContent=order.status.replaceAll('_',' ');card.append(badge);
  const values=[['Your design',order.design.place+' · '+order.design.color+' · '+order.design.size.toUpperCase()],['Coordinates',coords(order.design)],['Your story',order.design.caption],['Date',order.design.date],['Order reference',order.id],['Print reference',order.prodigiId||'Awaiting payment-confirmed submission']];
  for(const [label,value] of values){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(value));if(label.includes('reference'))p.className='order-ref';card.append(p);}
  if(order.shipment?.trackingNumber){const p=document.createElement('p');p.textContent='Tracking: '+order.shipment.trackingNumber;card.append(p);}
  if(order.status==='submitting')setTimeout(refreshOrder,10000);
 }catch(e){$('#order-title').textContent='We couldn’t find that order.';$('#order-message').textContent='Use the complete order link including its private access token.';$('#order-error').textContent=e.message;}
 finally{refreshing=false;$('#refresh-order').disabled=false;}
}
async function init(){
 setupDialogs();
 shirt($('#hero-shirt'),presets['big-sur']);Object.values(presets).forEach((d,i)=>shirt($('#example-'+i),d));
 try{const saved=JSON.parse(localStorage.getItem('somewhere-yours-design'));if(saved&&['black','natural','white'].includes(saved.color)&&palettes[saved.palette])state={...state,...saved};}catch{}
 fillInputs();
 for(const input of $$('#design-form input:not([type=checkbox])'))input.addEventListener('input',readInputs);
 for(const key of ['palette','color','size'])for(const button of $$('[data-'+key+']'))button.addEventListener('click',()=>{state[key]=button.dataset[key];requestId=crypto.randomUUID();$('#approve').checked=false;render();});
 for(const button of $$('[data-preset]'))button.addEventListener('click',()=>{state={...presets[button.dataset.preset]};requestId=crypto.randomUUID();$('#approve').checked=false;fillInputs();$('#studio').scrollIntoView({behavior:'smooth'});});
 $('#download').addEventListener('click',download);$('#design-form').addEventListener('submit',checkout);$('#refresh-order').addEventListener('click',refreshOrder);
 try{
  configuration=await api('/api/config');
  if(configuration.checkoutReady){$('#payment-notice').textContent=configuration.sandbox?'Test checkout is ready. Use Stripe test card 4242 4242 4242 4242, any future expiry and any CVC. No real charge or shipment.':'Checkout is ready. Taxes, if applicable, appear in Stripe Checkout.';}
  else{$('#payment-notice').textContent='Sandbox preview · Checkout awaits the merchant’s Stripe connection. Customize your shirt and download the print now.';}
  if(!configuration.sandbox)$('#testbar').textContent='MADE FOR YOUR SOMEWHERE · Original personal prints, made to order.';
 }catch{$('#payment-notice').textContent='Checkout connection unavailable. Your personal print can still be downloaded.';}
 if(location.pathname.startsWith('/order/')){$('#storefront').classList.add('hidden');$('#order-view').classList.remove('hidden');await refreshOrder();}
 else if(new URLSearchParams(location.search).get('checkout')==='cancelled'){$('#checkout-error').textContent='Checkout was canceled. No shirt has been sent to print. Your design is still here.';requestId=crypto.randomUUID();}
}
init();
