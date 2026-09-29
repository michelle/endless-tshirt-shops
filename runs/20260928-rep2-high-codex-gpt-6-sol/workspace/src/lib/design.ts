export type Palette = 'aurora' | 'ember' | 'violet';
export type Size = 'S' | 'M' | 'L' | 'XL' | '2XL';
export type Design = { names: string; place: string; date: string; message: string; palette: Palette; size: Size };
export const palettes: Record<Palette, { label: string; primary: string; secondary: string; glow: string }> = {
  aurora: { label: 'Aurora', primary: '#90E6D0', secondary: '#D8F2BC', glow: '#5ABFAF' },
  ember: { label: 'Ember', primary: '#FFAD83', secondary: '#F4D599', glow: '#E96E69' },
  violet: { label: 'Violet', primary: '#C8AFF9', secondary: '#F1B8DD', glow: '#9B89DD' },
};
export const sizes: Size[] = ['S', 'M', 'L', 'XL', '2XL'];
export const defaultDesign: Design = { names: 'ALEX & JAMIE', place: 'SAN FRANCISCO', date: '2024-06-21', message: 'THE DAY OUR WORLDS ALIGNED', palette: 'aurora', size: 'M' };
const clean = (v: unknown, max: number) => typeof v === 'string' ? v.trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, max) : '';
export function normalizeDesign(input: unknown): Design {
  const d = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const names = clean(d.names, 28);
  const place = clean(d.place, 28);
  const message = clean(d.message, 42);
  const date = clean(d.date, 10);
  if (!names || !place || !message || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error('Please complete all personalization fields with a valid date.');
  const palette = d.palette as Palette;
  const size = d.size as Size;
  if (!Object.prototype.hasOwnProperty.call(palettes, palette) || !sizes.includes(size)) throw new Error('Please select a valid color story and size.');
  return { names, place, message, date, palette, size };
}
export function escapeXml(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }
function hash(s: string) { let h=2166136261; for (let i=0;i<s.length;i++) { h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function random(seed: number) { let state=seed; return () => { state=(Math.imul(state,1664525)+1013904223)>>>0; return state/4294967296; }; }
export function designSvg(d: Design): string {
  const p=palettes[d.palette], rnd=random(hash(`${d.names}|${d.place}|${d.date}|${d.message}`));
  const stars=Array.from({length:88},(_,i)=>{ const x=90+rnd()*620, y=150+rnd()*575, r=i%17===0?2.3:0.5+rnd()*1.3; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${i%3===0?p.secondary:p.primary}" opacity="${(0.25+rnd()*0.65).toFixed(2)}"/>`; }).join('');
  const points=Array.from({length:7},(_,i)=>{const a=(-2.3+i*0.78)+(rnd()-.5)*0.24; const radius=115+rnd()*105; return {x:400+Math.cos(a)*radius,y:430+Math.sin(a)*radius};});
  const constellation=`<polyline points="${points.map(v=>`${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ')}" fill="none" stroke="${p.secondary}" stroke-width="2.2" opacity=".72"/>${points.map((v,i)=>`<circle cx="${v.x.toFixed(1)}" cy="${v.y.toFixed(1)}" r="${i===3?7:4.2}" fill="${p.secondary}"/><circle cx="${v.x.toFixed(1)}" cy="${v.y.toFixed(1)}" r="${i===3?13:9}" fill="none" stroke="${p.primary}" opacity=".4"/>`).join('')}`;
  const dt=new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).toUpperCase();
  const place=escapeXml(d.place.toUpperCase()), names=escapeXml(d.names.toUpperCase()), msg=escapeXml(d.message.toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4680" height="5790" viewBox="0 0 800 990"><defs><radialGradient id="planet"><stop stop-color="${p.primary}" stop-opacity=".22"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient><linearGradient id="arc" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.primary}"/><stop offset="1" stop-color="${p.secondary}"/></linearGradient></defs><g font-family="Arial,Helvetica,sans-serif" text-anchor="middle"><text x="400" y="106" fill="${p.primary}" font-size="18" font-weight="700" letter-spacing="10">A STORY IN THE STARS</text><path d="M165 125H635" stroke="${p.primary}" opacity=".5" stroke-width="2"/>${stars}<circle cx="400" cy="430" r="266" fill="url(#planet)"/><circle cx="400" cy="430" r="233" fill="none" stroke="${p.primary}" stroke-width="2" opacity=".58"/><circle cx="400" cy="430" r="185" fill="none" stroke="${p.secondary}" stroke-width="1.8" opacity=".36" stroke-dasharray="4 10"/><ellipse cx="400" cy="430" rx="275" ry="113" transform="rotate(-24 400 430)" fill="none" stroke="url(#arc)" stroke-width="4" opacity=".84"/><ellipse cx="400" cy="430" rx="275" ry="113" transform="rotate(51 400 430)" fill="none" stroke="${p.primary}" stroke-width="2" opacity=".34"/>${constellation}<circle cx="604" cy="253" r="10" fill="${p.secondary}"/><circle cx="604" cy="253" r="18" fill="none" stroke="${p.secondary}" opacity=".45"/><path d="M178 702H622" stroke="${p.primary}" opacity=".6" stroke-width="2"/><text x="400" y="757" fill="#F9F5EC" font-size="54" font-family="Georgia,serif" font-style="italic" textLength="${Math.min(530,Math.max(250,d.names.length*32))}" lengthAdjust="spacingAndGlyphs">${names}</text><text x="400" y="802" fill="${p.primary}" font-size="20" font-weight="700" letter-spacing="6" textLength="${Math.min(520,Math.max(150,d.place.length*14))}" lengthAdjust="spacing">${place}  ·  ${escapeXml(dt)}</text><path d="M280 833H520" stroke="${p.primary}" opacity=".48" stroke-width="1.5"/><text x="400" y="879" fill="#F9F5EC" font-size="19" letter-spacing="3" textLength="${Math.min(535,Math.max(200,d.message.length*13))}" lengthAdjust="spacingAndGlyphs">${msg}</text><text x="400" y="935" fill="${p.primary}" font-size="15" letter-spacing="9">OUR ORBIT · NO. ${String(hash(d.names+d.date)%9000+1000)}</text></g></svg>`;
}
