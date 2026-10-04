export type Design = { place: string; caption: string; date: string; palette: 'golden' | 'alpine' | 'dusk' };
export const initialDesign: Design = { place:'YOSEMITE', caption:'WHERE WE FOUND OUR WILD', date:'2026-06-21', palette:'golden' };
export const sizes = ['s','m','l','xl','2xl'] as const;
export const palettes = { golden: {label:'Golden hour',color:'#ed9328',filter:'none'}, alpine:{label:'Alpine blue',color:'#41a8b2',filter:'hue-rotate(155deg)'}, dusk:{label:'Desert dusk',color:'#ce6c95',filter:'hue-rotate(315deg)'} };
export function validateDesign(d: unknown): Design {
 const x=d as Design;
 if (!x || typeof x.place!=='string' || !/^[a-zA-Z0-9 .,'&!\-]{1,22}$/.test(x.place.trim()) || typeof x.caption!=='string' || !/^[a-zA-Z0-9 .,'&!\-]{1,38}$/.test(x.caption.trim()) || !/^\d{4}-\d{2}-\d{2}$/.test(x.date) || !Number.isFinite(Date.parse(x.date)) || !Object.keys(palettes).includes(x.palette)) throw new Error('Please use 1–22 letters for your place, 1–38 for your caption, and a valid date.');
 return {place:x.place.trim().toUpperCase(),caption:x.caption.trim().toUpperCase(),date:x.date,palette:x.palette};
}
export function displayDate(date:string) { return new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric',timeZone:'UTC'}).toUpperCase(); }
export async function renderPrint(d:Design, width=4677): Promise<HTMLCanvasElement> {
 const h=Math.round(width*5881/4677), c=document.createElement('canvas');c.width=width;c.height=h;
 const g=c.getContext('2d')!;const scale=width/4677;g.scale(scale,scale);
 const img=new Image();img.src='/art/landscape.png';await img.decode();
 await document.fonts.load('800 100px "Studio"');
 g.textAlign='center';g.fillStyle='#fff0c9';
 // Conservative 10.5 inch wide illustration within the 15.59 inch print area.
 const fitText=(text:string,size:number,max:number,y:number)=>{g.font=`800 ${size}px Studio, sans-serif`;while(g.measureText(text).width>max){size-=2;g.font=`800 ${size}px Studio, sans-serif`;}g.fillText(text,2338.5,y);};
 fitText(d.place,410,3400,870);
 g.filter=palettes[d.palette].filter;
 g.drawImage(img,768,1010,3141,3925);g.filter='none';
 fitText(d.caption,130,3400,5160);
 g.font='600 100px Studio, sans-serif';g.fillStyle='#edb45c';g.fillText(displayDate(d.date)+'  /  SOMEWHERE STUDIO',2338.5,5400);
 return c;
}
