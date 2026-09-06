import { z } from 'zod';
export const products = [
 {id:'orbit',number:'01',name:'Keep Looking Up',subtitle:'For the ones who stay out a little later.',label:'THE ORBIT TEE',ink:'#c7efb7',story:'An orbital study for the backyard observers, meteor chasers, and people who know the best view is above them.'},
 {id:'phase',number:'02',name:'Just One More Phase',subtitle:'A little lunar obsession looks good on you.',label:'THE LUNAR TEE',ink:'#e8dcbc',story:'One moon. An endlessly changing view. A lunar phase diagram for anyone who plans their evenings around the sky.'},
 {id:'pluto',number:'03',name:'Still a Planet to Me',subtitle:'Small world. Very loyal fan club.',label:'THE PLUTO TEE',ink:'#c7d9fa',story:'For the unofficial ninth-planet fan club. A small tribute to the distant world that still has a place in our hearts.'},
] as const;
export const sizes=['s','m','l','xl','2xl'] as const;
export const PRICE=3200, SHIPPING=600, SKU='GLOBAL-TEE-GIL-64000';
export const cartSchema=z.array(z.object({id:z.enum(['orbit','phase','pluto']),size:z.enum(sizes),quantity:z.number().int().min(1).max(5)}).strict()).min(1).max(6).refine(a=>a.reduce((s,i)=>s+i.quantity,0)<=10,'Maximum 10 shirts per order').refine(a=>new Set(a.map(i=>i.id+':'+i.size)).size===a.length,'Duplicate bag items');
export type CartItem=z.infer<typeof cartSchema>[number];
export const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n/100);
export function total(items:CartItem[]){return items.reduce((s,i)=>s+i.quantity*PRICE,0)+SHIPPING;}

export function artworkPath(id:string,extension='svg',revision='v2'){return `/artwork/${id}-${id==='phase'&&revision==='v2'?'v2':'v1'}.${extension}`;}
