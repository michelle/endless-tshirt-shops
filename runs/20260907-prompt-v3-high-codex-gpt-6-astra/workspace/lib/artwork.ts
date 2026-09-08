import { readFileSync } from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';
import {Design,designSvg} from './design';
let fonts: {regular:opentype.Font,bold:opentype.Font}|undefined;
function getFonts(){if(!fonts){const load=(name:string)=>{const b=readFileSync(path.join(process.cwd(),'public/fonts',name));return opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer);};fonts={regular:load('orbit-regular.woff'),bold:load('orbit-bold.woff')};}return fonts;}
// Outline the bundled OFL font so preview and DTG print don't depend on system fonts.
export function outlinedSvg(d:Design,print=false){const f=getFonts();return designSvg(d,print).replace(/<text ([^>]+)>([^<]*)<\/text>/g,(_,attrs:string,encoded:string)=>{
 const attr=(key:string)=>new RegExp(`(?:^| )${key}="([^"]*)"`).exec(attrs)?.[1];
 const text=encoded.replace(/&(lt|gt|amp|quot|apos);/g,(_,v:string)=>({lt:'<',gt:'>',amp:'&',quot:'"',apos:"'"}[v]!));
 const size=Number(attr('font-size')),spacing=Number(attr('letter-spacing')||0),font=attr('font-weight')==='700'?f.bold:f.regular;
 const glyphs=font.stringToGlyphs(text),scale=size/font.unitsPerEm;
 const width=glyphs.reduce((a,g)=>a+(g.advanceWidth||0)*scale,0)+Math.max(0,glyphs.length-1)*spacing;
 let x=Number(attr('x'))-width/2; const y=Number(attr('y'));
 return `<g fill="${attr('fill')||'#f5f4ef'}">`+glyphs.map(g=>{const out=g.getPath(x,y,size).toPathData(3);x+=(g.advanceWidth||0)*scale+spacing;return `<path d="${out}"/>`;}).join('')+'</g>';
 });}
export async function printPng(d:Design){return sharp(Buffer.from(outlinedSvg(d,true))).png().withMetadata({density:300}).toBuffer();}
