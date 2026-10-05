import { z } from 'zod';
const copy = (max:number) => z.string().trim().min(1).max(max).regex(/^[A-Za-z0-9 .,!'&()\-]+$/, 'Use English letters, numbers and simple punctuation.');
export const designSchema = z.object({place:copy(22),caption:copy(36),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s,'Choose a valid date'),scene:z.enum(['coast','alpine','desert']),size:z.enum(['s','m','l','xl','2xl']),edition:z.number().int().min(1).max(9999)}).strict();
export type Design=z.infer<typeof designSchema>;
export const initialDesign:Design={place:'BIG SUR',caption:'THE LONG WAY HOME',date:'2026-06-21',scene:'coast',size:'m',edition:1};
export type Shape={kind:'path';d:string;fill:string}|{kind:'circle';x:number;y:number;r:number;fill:string}|{kind:'text';x:number;y:number;text:string;size:number;fill:string;bold?:boolean};
export function shapes(d:Design):Shape[]{
 let seed=2166136261; for(const c of `${d.place}${d.caption}${d.date}${d.edition}`)seed=Math.imul(seed^c.charCodeAt(0),16777619);const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296};
 const a:Shape[]=[];const path=(s:string,c:string)=>a.push({kind:'path',d:s,fill:c}); const txt=(t:string,y:number,size:number,bold=false)=>a.push({kind:'text',text:t,x:300,y,size,fill:'#263e38',bold});
 txt('A PLACE TO KEEP',44,13,true);txt(d.place.toUpperCase(),94,Math.min(46,500/Math.max(1,d.place.length)),true);
 path('M 50 370 L 50 270 C 50 60 550 60 550 270 L 550 370 Z','#e6b684');
 a.push({kind:'circle',x:370+rand()*50,y:228,r:49,fill:'#c85436'});
 if(d.scene==='alpine'){
 path(`M 50 425 L 50 360 L 170 ${228+rand()*30} L 240 335 L 355 ${192+rand()*30} L 550 384 L 550 425 Z`,'#7e9892');
 path('M 279 292 L 355 208 L 409 267 L 363 250 L 341 270 L 327 257 Z','#f5e8cc');
 } else if(d.scene==='desert'){
 path(`M 50 445 L 50 310 L 144 310 L 160 ${260+rand()*20} L 259 277 L 279 349 L 400 349 L 420 285 L 500 285 L 550 352 L 550 445 Z`,'#b76b43');
 } else path(`M 50 455 L 50 315 C 125 290 165 ${310+rand()*30} 245 375 C 301 407 309 390 380 433 L 550 490 L 550 520 L 50 520 Z`,'#788a62');
 const palette=d.scene==='desert'?['#d78652','#a95237','#743e32']:d.scene==='alpine'?['#658173','#3f655b','#294e48']:['#568a8c','#366d79','#274f5c'];
 for(let i=0;i<3;i++){let y=384+i*59;path(`M 50 ${y+40} C 190 ${y-40+rand()*40} 300 ${y+75} 550 ${y-15} L 550 594 L 50 594 Z`,palette[i]);}
 for(let i=0;i<7;i++){let y=448+i*19;path(`M ${320+i*8} ${y} C 385 ${y-8} 450 ${y-8} 512 ${y-17} L 512 ${y-14} C 449 ${y-5} 385 ${y-5} ${320+i*8} ${y+3} Z`,'#c8d8c5');}
 path('M 50 594 L 550 594 L 550 600 L 50 600 Z','#263e38');
 txt(d.caption.toUpperCase(),646,Math.min(18,500/Math.max(1,d.caption.length)),true);
 txt(`${d.date.replaceAll('-',' . ')}  /  NO. ${String(d.edition).padStart(4,'0')}`,677,13);
 txt('FIELD NOTES  /  YOUR OWN LITTLE WORLD',716,10,true);return a;
}
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function designSvg(d:Design){return `<svg xmlns="http://www.w3.org/2000/svg" width="2490" height="3510" viewBox="0 0 600 846">${shapes(d).map(s=>s.kind==='path'?`<path d="${s.d}" fill="${s.fill}"/>`:s.kind==='circle'?`<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.fill}"/>`:`<text x="${s.x}" y="${s.y}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-weight="${s.bold?700:400}" font-size="${s.size}" fill="${s.fill}">${esc(s.text)}</text>`).join('')}</svg>`}
