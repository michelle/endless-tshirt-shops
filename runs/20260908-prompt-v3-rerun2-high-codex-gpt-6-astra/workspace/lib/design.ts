import { z } from 'zod';
import { outlineText } from './outline-text';
const printText = (max: number) => z.string().trim().min(1).max(max).regex(/^[A-Za-z0-9 .,'&!?+()\/-]+$/, 'Use English letters, numbers and basic punctuation.');
export const designSchema = z.object({place:printText(28),caption:printText(40),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=> !isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v),'Choose a valid date.'),latitude:z.coerce.number().min(-90).max(90),longitude:z.coerce.number().min(-180).max(180),palette:z.enum(['ember','ocean','forest']),size:z.enum(['s','m','l','xl','2xl']),color:z.literal('natural')});
export type Design = z.infer<typeof designSchema>;
export const initialDesign: Design = {place:'JOSHUA TREE',caption:'THE DAY WE TOOK THE LONG WAY',date:'2024-06-21',latitude:34.1347,longitude:-116.3131,palette:'ember',size:'m',color:'natural'};
export const palettes = {ember:['#b8492e','#d8843c','#243d39'],ocean:['#245866','#589caa','#163945'],forest:['#3c5943','#8e9660','#283d36']};
export const PRICE=3800, SHIPPING=600, SKU='GLOBAL-TEE-BC-3001';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function artwork(d:Design):string {
 const colors=palettes[d.palette];
 const seed=[d.place,d.caption,d.date,d.latitude,d.longitude].join('|').split('').reduce((s,c)=>(Math.imul(s,31)+c.charCodeAt(0))>>>0,17);
 const phase=(seed%1000)/157, cx=300+Math.sin(phase)*35, cy=302+Math.cos(phase)*25;
 const contours=Array.from({length:27},(_,i)=>{const r=16+i*7.3; const points=Array.from({length:161},(_,j)=>{const a=j/160*Math.PI*2;const rr=r*(1+.12*Math.sin(a*3+phase)+.07*Math.cos(a*5-phase))+7*Math.sin(a*2+phase);return `${j?'L':'M'}${(cx+rr*Math.cos(a)).toFixed(2)},${(cy+rr*.91*Math.sin(a)).toFixed(2)}`;}).join(' ');return `<path d="${points}Z" fill="none" stroke="${colors[Math.floor(i/9)]}" stroke-width="${i%3===0?2.2:1.3}"/>`;}).join('');
 const coord=`${Math.abs(d.latitude).toFixed(4)}° ${d.latitude<0?'S':'N'} / ${Math.abs(d.longitude).toFixed(4)}° ${d.longitude<0?'W':'E'}`;
 return outlineText(`<svg xmlns="http://www.w3.org/2000/svg" width="2490" height="3510" viewBox="0 0 600 846"><defs><clipPath id="c"><rect x="56" y="100" width="488" height="430" rx="220"/></clipPath></defs><g transform="translate(0 52)" fill="${colors[2]}" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif"><text x="300" y="55" font-size="12" letter-spacing="5">DAYMARK / PERSONAL GEOGRAPHY</text><text x="300" y="91" font-size="${d.place.length>20?23:29}" font-weight="700" letter-spacing="2">${esc(d.place.toUpperCase())}</text><g clip-path="url(#c)">${contours}</g><path d="M290 304h20m-10-10v20" stroke="${colors[0]}" stroke-width="2"/><text x="300" y="570" font-size="13" letter-spacing="2">${coord}</text><path d="M225 598h150" stroke="${colors[2]}"/><text x="300" y="632" font-size="${d.caption.length>30?12:15}" letter-spacing="1">${esc(d.caption.toUpperCase())}</text><text x="300" y="666" font-size="13" letter-spacing="3">${d.date.replaceAll('-',' / ')}</text><text x="300" y="713" font-size="9" letter-spacing="3">ONE PLACE. ONE MOMENT. ONLY YOURS.</text></g></svg>`);
}
export function designDataUri(d:Design){return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artwork(d))}`;}
