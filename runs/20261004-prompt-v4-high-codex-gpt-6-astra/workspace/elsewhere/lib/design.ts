export const PALETTES = {
  aurora: { name: 'Aurora', colors: ['#c2e8fa', '#8c81ed', '#f5a1d0'] },
  ember: { name: 'Ember', colors: ['#ffe6a2', '#ffaf72', '#f26752'] },
  tide: { name: 'Tide', colors: ['#d8f9df', '#72dbc5', '#76a7ed'] },
} as const;
export type Design = { place: string; date: string; dedication: string; palette: keyof typeof PALETTES };
export const INITIAL: Design = { place: 'JOSHUA TREE', date: '2024-09-21', dedication: 'WHERE WE FOUND OURSELVES', palette: 'aurora' };
export const SIZES = ['s','m','l','xl','2xl'] as const;
export const PRICE = 4200, SHIPPING = 600;
export const SKU = 'GLOBAL-TEE-GIL-64000';
export function validateDesign(v: any): Design {
  if (!v || typeof v !== 'object') throw new Error('Please personalize your shirt first.');
  const place = String(v.place || '').trim().toUpperCase();
  const dedication = String(v.dedication || '').trim().toUpperCase();
  if (!place || place.length > 24 || !/^[A-Z0-9 .,'&!()\-]+$/.test(place)) throw new Error('Place: use 1–24 English letters, numbers or simple punctuation.');
  if (dedication.length > 36 || !/^[A-Z0-9 .,'&!()\-]*$/.test(dedication)) throw new Error('Dedication: use up to 36 English letters, numbers or simple punctuation.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || !Number.isFinite(Date.parse(v.date)) || new Date(v.date).toISOString().slice(0,10) !== v.date || v.date < '1900-01-01' || v.date > '2100-12-31') throw new Error('Choose a valid date between 1900 and 2100.');
  if (!Object.hasOwn(PALETTES, v.palette)) throw new Error('Choose an ink palette.');
  return { place, dedication, date: v.date, palette: v.palette };
}
export function fingerprint(d: Design) {
  let h = 2166136261;
  for (const c of `${d.place}|${d.date}|${d.dedication}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}
const mix = (a: string,b: string,t:number) => '#' + [1,3,5].map(i => Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
export function art(d: Design) {
  const h = fingerprint(d), phase = (h % 1000) / 159;
  const colors = PALETTES[d.palette].colors;
  const paths = Array.from({length: 46}, (_,k) => {
    const t=k/45, r=54+k*4.3;
    const points = Array.from({length:181}, (_,i) => {
      const a=i*Math.PI/90;
      const w=1 + .10*Math.sin(a*3+phase+t*2)+.055*Math.cos(a*5-phase-t);
      return [400+Math.cos(a)*r*w, 468+Math.sin(a)*r*w*.91] as [number,number];
    });
    return { points, color: t<.5?mix(colors[0],colors[1],t*2):mix(colors[1],colors[2],(t-.5)*2), width:2.35 };
  });
  const formatted = d.date.split('-').reverse().join(' . ');
  const texts = [
    {text: 'A PLACE IN TIME', x:400,y:128,size:15,spacing:4,bold:false},
    {text:d.place || 'YOUR PLACE', x:400,y:191,size:Math.min(48,720/Math.max(d.place.length*.7,1)),spacing:1,bold:true},
    {text:formatted,x:400,y:768,size:21,spacing:3,bold:false},
    {text:d.dedication,x:400,y:818,size:16,spacing:1.4,bold:false},
    {text:`ELSEWHERE / ${h.toString(16).toUpperCase().padStart(8,'0')}`,x:400,y:899,size:11,spacing:2,bold:false},
  ];
  return {paths,texts};
}
const esc = (s:string) => s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function designSvg(d:Design) {
  const {paths,texts}=art(d);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1006"><g fill="none">${paths.map(p=>`<path stroke="${p.color}" stroke-width="${p.width}" stroke-linejoin="round" d="${p.points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`).join('')}Z"/>`).join('')}</g>${texts.map(t=>`<text x="${t.x}" y="${t.y}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-weight="${t.bold?700:400}" font-size="${t.size}" letter-spacing="${t.spacing}" fill="#f4f1e9">${esc(t.text)}</text>`).join('')}</svg>`;
}
