export type Design = { place: string; date: string; dedication: string; landscape: 'mountain'|'coast'|'desert'; palette:'dusk'|'ocean'|'earth'; color:'sand'|'black'|'white'; size:'s'|'m'|'l'|'xl'|'2xl' };
export const defaults: Design = {place:'JOSHUA TREE',date:'2026-06-21',dedication:'A little closer to nowhere',landscape:'desert',palette:'dusk',color:'sand',size:'m'};
export const palettes = {dusk:['#f3ddaf','#dc916d','#bc6358','#754c57','#343f46'],ocean:['#e4e2c0','#d7ab77','#779e9c','#467b82','#254852'],earth:['#e8d8af','#d7b37c','#9ba17b','#657761','#324a3f']};
function escape(s:string){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));}
function seed(s:string){let h=2166136261; for(const c of s){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;}
export function artwork(d:Design){
 const p=palettes[d.palette], h=seed(d.place+d.date+d.dedication); let n=h;
 const rnd=()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};
 const sunX=170+rnd()*210, sunY=205+rnd()*45;
 let scenery='';
 if(d.landscape==='mountain'){
  for(let i=0;i<4;i++){let path=`M 65 ${395+i*55}`; for(let x=65;x<=535;x+=47)path+=` L ${x} ${285+i*67+rnd()*85}`;path+=' L 535 560 L 65 560 Z';scenery+=`<path d="${path}" fill="${p[Math.min(i+1,4)]}"/>`;}
  scenery+=`<path d="M 181 348 L 229 280 L 271 343 L 232 325 L 221 343 L 205 333 Z" fill="${p[0]}" opacity=".8"/>`;
 } else if(d.landscape==='coast'){
  for(let i=0;i<4;i++)scenery+=`<path d="M 65 ${340+i*60} Q 180 ${300+i*60+rnd()*25} 300 ${355+i*55} T 535 ${340+i*60} V 560 H 65 Z" fill="${p[Math.min(i+1,4)]}"/>`;
  scenery+=`<path d="M 65 405 Q 140 397 225 425 T 535 443 M 65 465 Q 270 440 535 490" fill="none" stroke="${p[0]}" stroke-width="4" opacity=".8"/>`;
 }else{
  for(let i=0;i<4;i++)scenery+=`<path d="M 65 ${365+i*54} Q ${170+rnd()*100} ${245+i*77} 340 ${367+i*49} T 535 ${335+i*67} V 560 H 65 Z" fill="${p[Math.min(i+1,4)]}"/>`;
  scenery+=`<g fill="none" stroke="${p[4]}" stroke-width="13" stroke-linecap="round"><path d="M 192 500 V 398 M 192 455 H 169 Q 157 455 157 443 V 427 M 192 436 H 215 Q 229 436 229 424 V 412"/><path d="M 437 536 V 468 M 437 495 H 423 V 482"/></g>`;
 }
 let stars='';for(let i=0;i<14;i++){const x=110+rnd()*380,y=130+rnd()*180;stars+=`<circle cx="${x}" cy="${y}" r="${1.5+rnd()*2}" fill="${p[0]}" opacity=".65"/>`;}
 const label=d.place.toUpperCase(), ink=d.color==='black'?'#ecdfc5':'#303c38';
 const date=new Date(d.date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric',timeZone:'UTC'}).toUpperCase();
 return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760" viewBox="0 0 600 760"><defs><clipPath id="arch"><path d="M 65 560 V 315 A 235 235 0 0 1 535 315 V 560 Z"/></clipPath><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${p[4]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient></defs><text x="300" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" letter-spacing="7" fill="${ink}">ELSEWHERE FIELD CLUB</text><g clip-path="url(#arch)"><rect x="65" y="80" width="470" height="480" fill="url(#sky)"/><circle cx="${sunX}" cy="${sunY}" r="67" fill="${p[0]}"/>${stars}${scenery}</g><path d="M 65 560 V 315 A 235 235 0 0 1 535 315 V 560" fill="none" stroke="${ink}" stroke-width="5"/><text x="300" y="619" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="${Math.min(43,470/(label.length*.62))}" letter-spacing="2" fill="${ink}">${escape(label)}</text><path d="M 65 642 H 535" stroke="${ink}" stroke-width="2"/><text x="300" y="673" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" letter-spacing="4" fill="${ink}">${date} · № ${String(h%100000).padStart(5,'0')}</text><text x="300" y="715" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.min(21,470/(d.dedication.length*.58))}" fill="${ink}">${escape(d.dedication)}</text><path d="M 289 745 L 300 734 L 311 745 M 300 734 V 754" stroke="${ink}" fill="none" stroke-width="3"/></svg>`;
}
export async function printPng(d:Design):Promise<Blob>{
 await document.fonts.ready;
 const svg=artwork(d),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{const img=new Image();img.src=url;await img.decode(); const c=document.createElement('canvas');c.width=4677;c.height=5881;const ctx=c.getContext('2d')!;const w=3300,h=w*760/600;ctx.drawImage(img,(4677-w)/2,420,w,h);return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Unable to export print')),'image/png'));}finally{URL.revokeObjectURL(url);}
}
