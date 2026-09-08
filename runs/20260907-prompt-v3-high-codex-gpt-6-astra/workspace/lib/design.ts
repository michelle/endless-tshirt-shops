import { z } from 'zod';
const words = (max: number) => z.string().trim().min(1).max(max).regex(/^[A-Za-z0-9 .,!?&'()\-]+$/, 'Use English letters, numbers, and simple punctuation.');
export const designSchema = z.object({
  place: words(24), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v + 'T12:00:00Z'); return !isNaN(+d) && d.toISOString().slice(0,10) === v && +v.slice(0,4) >= 1900 && +v.slice(0,4) <= 2100; }, 'Choose a valid date between 1900 and 2100.'),
  dedication: words(32), palette: z.enum(['solar','electric','aurora']),
});
export const checkoutSchema = z.object({design: designSchema, size: z.enum(['s','m','l','xl','2xl']), quantity:z.number().int().min(1).max(5), requestId:z.string().uuid()});
export type Design = z.infer<typeof designSchema>;
export const DEFAULT_DESIGN: Design = {place:'JOSHUA TREE', date:'2024-08-17', dedication:'RIGHT WHERE WE BELONG', palette:'solar'};
export const PALETTES = {solar:{name:'Solar flare', colors:['#ff6a37','#ffb460','#f54d89']}, electric:{name:'Electric blue',colors:['#42caff','#8882ff','#ff76dc']},aurora:{name:'Aurora',colors:['#baff74','#34dac6','#e2ff99']}};
export const UNIT_PRICE = 3800;
export const SHIPPING = 600;
export const STORE_ID = 'personal-orbit-v1';
export const SKU = 'GLOBAL-TEE-GIL-64000';
function hash(s:string) { let h=2166136261; for(const c of s) h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0; }
export function edition(d:Design){return hash(JSON.stringify(d)).toString(16).toUpperCase().padStart(8,'0');}
export function escapeXml(s:string){return s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));}
// The same deterministic geometry is used for the preview and production PNG.
// An abstract visual fingerprint, not an astronomical sky map.
export function designSvg(d:Design, print=false){
 const h=hash(d.place+d.date+d.dedication), colors=PALETTES[d.palette].colors;
 const rotation=h%180, squash=.36+(h%25)/100;
 let shapes='';
 for(let i=0;i<48;i++){
  const r=72+i*2.3, angle=rotation+i*3.1;
  shapes+=`<ellipse cx="300" cy="310" rx="${r}" ry="${r*squash}" transform="rotate(${angle} 300 310)" fill="none" stroke="${colors[Math.floor(i/16)]}" stroke-width="1.65" opacity=".96"/>`;
 }
 const dotAngle=(h%360)*Math.PI/180, dx=300+177*Math.cos(dotAngle),dy=310+165*Math.sin(dotAngle);
 const dt=d.date.split('-');
 const content=`<g font-family="Orbit,Arial,sans-serif" text-anchor="middle" fill="#f5f4ef"><text x="300" y="45" font-size="14" letter-spacing="5">PERSONAL ORBIT</text><text x="300" y="93" font-size="${d.place.length>17?26:34}" font-weight="700" letter-spacing="2">${escapeXml(d.place.toUpperCase())}</text>${shapes}<circle cx="${dx}" cy="${dy}" r="7" fill="#fff4de"/><path d="M280 310h40 M300 290v40" stroke="#f5f4ef" stroke-width="1" opacity=".65"/><text x="300" y="535" font-size="17" letter-spacing="5">${dt[1]} . ${dt[2]} . ${dt[0]}</text><text x="300" y="577" font-size="${d.dedication.length>24?13:16}" letter-spacing="2">${escapeXml(d.dedication.toUpperCase())}</text><text x="300" y="627" font-size="10" letter-spacing="3" fill="${colors[1]}">ONE MOMENT / YOUR UNIVERSE</text></g>`;
 return print ? `<svg xmlns="http://www.w3.org/2000/svg" width="4677" height="5881" viewBox="0 0 600 754.47">${content}</svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="650" viewBox="0 0 600 650">${content}</svg>`;
}
export function previewUrl(d:Design){return '/api/preview?design='+encodeURIComponent(JSON.stringify(d))+'&v=1';}
