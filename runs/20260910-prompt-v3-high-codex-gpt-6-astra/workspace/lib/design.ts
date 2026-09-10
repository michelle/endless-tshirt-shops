import { z } from 'zod';
import glyphs from './glyphs.js';
export const PRICE = 3800;
export const SHIPPING = 600;
export const SKU = 'GLOBAL-TEE-GIL-5000';
export const palettes = { forest: {name:'Forest / moss',ink:'#244c3d',accent:'#9eab64'}, canyon:{name:'Canyon / sunset',ink:'#963d29',accent:'#dfab5e'}, tide:{name:'Tide / sky',ink:'#244e73',accent:'#8fb9ba'} };
const label = (max:number) => z.string().trim().min(1).max(max).regex(/^[A-Za-z0-9 .,'!&()\-]+$/, 'Use letters, numbers, and basic punctuation.');
export const DesignSchema = z.object({ place:label(22), club:label(24), motto:label(36), year:z.string().regex(/^(19|20)\d{2}$/), palette:z.enum(['forest','canyon','tide']), seed:z.number().int().min(1).max(999999), size:z.enum(['s','m','l','xl','2xl']) }).strict();
export type Design = z.infer<typeof DesignSchema>;
export const defaultDesign:Design={place:'JOSHUA TREE',club:'WEEKEND WANDERERS',motto:'TAKE THE LONG WAY HOME',year:'1996',palette:'forest',seed:8241,size:'m'};
export function encodeDesign(d:Design){return JSON.stringify(d);}
function lettering(text:string,x:number,y:number,size:number,maxWidth:number,color:string){
 const g=glyphs as Record<string,{d:string;w:number}>; const letters=[...text.toUpperCase()];
 const width=letters.reduce((v,c)=>v+(g[c]?.w||600),0); const scale=Math.min(size/1000,maxWidth/width);let pos=-width/2;
 return `<g transform="translate(${x},${y}) scale(${scale},${-scale})" fill="${color}">${letters.map(c=>{const a=g[c]||g[' '];const p=`<path transform="translate(${pos},0)" d="${a.d}"/>`;pos+=a.w;return p;}).join('')}</g>`;
}
export function artwork(d:Design){
 const p=palettes[d.palette];const phase=d.seed*0.017;
 let lines='';
 for(let j=0;j<29;j++){let path=''; for(let i=0;i<=180;i++){const t=i/180*Math.PI*2;const base=17+j*6.0;const r=base*(1+0.105*Math.sin(t*3+phase)+0.07*Math.cos(t*5-phase)+0.055*Math.sin(t*2+phase*2));const x=400+Math.cos(t)*r*1.24+Math.sin(j*.065+phase)*13;const y=475+Math.sin(t)*r;path+=`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)} `;} lines+=`<path d="${path}Z" fill="none" stroke="${j%5===0?p.accent:p.ink}" stroke-width="${j%5===0?3.5:2.2}"/>`;}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1006" width="800" height="1006">${lettering('PERSONAL BEST OUTDOORS CLUB',400,116,16,480,p.ink)}${lettering(d.place,400,197,58,646,p.ink)}${lettering(d.club,400,236,19,560,p.ink)}${lines}<circle cx="400" cy="475" r="8" fill="${p.accent}"/>${lettering('EST. '+d.year+'   /   NO. '+String(d.seed).padStart(6,'0'),400,731,16,500,p.ink)}<path d="M130 765H670" stroke="${p.ink}" stroke-width="2"/>${lettering(d.motto,400,810,20,550,p.ink)}${lettering('GO SOMEWHERE. FEEL SOMETHING.',400,854,11,500,p.ink)}</svg>`;
}
