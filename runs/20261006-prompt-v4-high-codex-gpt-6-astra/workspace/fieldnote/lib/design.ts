import font from './glyphs.json';
export type Design = { place: string; dedication: string; date: string; lat: number; lon: number; palette: 'canyon'|'alpine'|'coast'; color: 'black'|'white'|'natural'; size: 's'|'m'|'l'|'xl'|'2xl' };
export const defaultDesign: Design = {place:'JOSHUA TREE',dedication:'THE LONG WAY HOME',date:'2026-06-21',lat:33.8734,lon:-115.901,palette:'canyon',color:'black',size:'m'};
export const palettes = {canyon:['#f3ca81','#da784d','#b94f3c','#773f3d','#e9ba74'],alpine:['#ecdcb4','#98bca8','#619384','#376659','#adc6a1'],coast:['#f1d79c','#9fbeb9','#609ca3','#376878','#ddac72']};
export function validateDesign(x: any): Design {
 if (!x || typeof x !== 'object') throw Error('Please complete your design.');
 for (const [k,max] of [['place',24],['dedication',36]] as const) if(typeof x[k] !== 'string' || !x[k].trim() || x[k].length>max || !/^[A-Za-z0-9 .,&!?/'-]+$/.test(x[k])) throw Error(`${k === 'place'?'Place':'Dedication'}: use 1–${max} letters, numbers or basic punctuation.`);
 if(!['canyon','alpine','coast'].includes(x.palette)||!['black','white','natural'].includes(x.color)||!['s','m','l','xl','2xl'].includes(x.size)) throw Error('Choose an available shirt option.');
 if(typeof x.lat!=='number'||typeof x.lon!=='number'||!Number.isFinite(x.lat)||!Number.isFinite(x.lon)||Math.abs(x.lat)>90||Math.abs(x.lon)>180) throw Error('Enter valid latitude and longitude.');
 if(typeof x.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||!Number.isFinite(Date.parse(x.date))||new Date(x.date).toISOString().slice(0,10)!==x.date) throw Error('Choose a valid date.');
 return {place:x.place.trim().toUpperCase(),dedication:x.dedication.trim().toUpperCase(),date:x.date,lat:x.lat,lon:x.lon,palette:x.palette,color:x.color,size:x.size};
}
function lettering(s:string,y:number,size:number,color:string,max=780,spacing=25){
 const g=font.glyphs as Record<string,{d:string,w:number}>;const chars=[...s.toUpperCase()];const units=chars.reduce((n,c)=>n+(g[c]?.w||250)+spacing,0);const scale=Math.min(size/font.units,max/units);let x=(1000-units*scale)/2;
 return chars.map(c=>{const a=g[c]||g[' '];const p=`<path d="${a.d}" transform="translate(${x.toFixed(2)} ${y}) scale(${scale} -${scale})" fill="${color}"/>`;x+=(a.w+spacing)*scale;return p}).join('');
}
export function artwork(d:Design,width=1000,height=1257){
 const p=palettes[d.palette];const ink=d.color==='black'?'#f2e3c6':'#283c35';
 const seed=Math.abs(d.lat*53+d.lon*31+Date.parse(d.date)/86400000);let curves='';
 for(let j=0;j<5;j++){let pts='';for(let i=0;i<=24;i++){const x=160+i*680/24;const y=440+j*54+Math.sin(i*.39+seed*.02+j*.7)*(55-j*5)+Math.cos(i*.8+seed*.003)*18;pts+=`${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)} `;}curves+=`<path d="${pts}L840,805 L160,805Z" fill="${p[Math.min(j+1,4)]}"/>`;}
 let contours='';for(let j=0;j<15;j++){let pts='';for(let i=0;i<=40;i++){const x=140+i*18;const y=600+j*13+Math.sin(i*.21+j*.12+seed*.01)*30;pts+=`${i?'L':'M'}${x},${y.toFixed(1)} `}contours+=`<path d="${pts}" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="1.6"/>`;}
 const coords=`${Math.abs(d.lat).toFixed(4)} ${d.lat>=0?'N':'S'} / ${Math.abs(d.lon).toFixed(4)} ${d.lon>=0?'E':'W'}`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1000 1257"><defs><clipPath id="land"><path d="M160 560 A340 250 0 0 1 840 560 L840 795 Q500 880 160 795Z"/></clipPath></defs>${lettering('A PLACE TO RETURN TO',160,27,ink,740,140)}${lettering(d.place,258,110,ink)}<g clip-path="url(#land)"><path fill="${p[0]}" d="M150 100H850V860H150Z"/><circle cx="650" cy="382" r="67" fill="${ink}" opacity=".9"/>${curves}${contours}</g><path d="M165 905H390 M610 905H835" stroke="${ink}" stroke-width="2"/><path d="M500 877L507 898L529 905L507 912L500 933L493 912L471 905L493 898Z" fill="${ink}"/>${lettering(coords,978,27,ink,720,70)}${lettering(d.dedication,1040,36,ink,770,90)}${lettering(d.date.replaceAll('-',' / '),1090,23,ink,500,110)}</svg>`;
}
export async function renderPng(d:Design):Promise<Blob>{
 const source=URL.createObjectURL(new Blob([artwork(d,4677,5881)],{type:'image/svg+xml'}));
 try {const img=new Image();img.src=source;await img.decode();const canvas=document.createElement('canvas');canvas.width=4677;canvas.height=5881;canvas.getContext('2d')!.drawImage(img,0,0);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not render artwork.')),'image/png'));}finally{URL.revokeObjectURL(source)}
}
