import lettering from './lettering.json';
// IBM Plex Sans, SIL Open Font License (public/FONT-LICENSE.txt).
// Use identical outlined glyphs in browser and PNG renderer; no platform fonts.
export function outlineText(svg:string){
 return svg.replace(/<text([^>]*)>(.*?)<\/text>/g,(_match,attrs:string,encoded:string)=>{
  const attr=(name:string,fallback:number)=>Number(new RegExp(`${name}="([^"]+)"`).exec(attrs)?.[1]||fallback);
  const x=attr('x',0),y=attr('y',0),size=attr('font-size',14),spacing=attr('letter-spacing',0),weight=attr('font-weight',400)===700?'700':'400';
  const glyphs=lettering[weight] as Record<string,{w:number;d:string}>;
  const text=encoded.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
  const chars=Array.from(text),width=chars.reduce((n,c)=>n+(glyphs[c]?.w||0)*size/1000,0)+Math.max(0,chars.length-1)*spacing;
  let cursor=x-width/2;
  const paths=chars.map(c=>{const g=glyphs[c];if(!g)return '';const p=g.d?`<path d="${g.d}" transform="translate(${cursor.toFixed(3)} ${y}) scale(${size/1000})"/>`:'';cursor+=g.w*size/1000+spacing;return p;}).join('');
  return `<g aria-label="${encoded}">${paths}</g>`;
 });
}
