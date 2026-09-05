import { z } from 'zod';
export const SIZES = ['S', 'M', 'L', 'XL'] as const;
export const PRICE = 3000;
export const SHIPPING = 600;
export const catalog = {
  unisex: {name:'Unisex', sku:'GLOBAL-TEE-BC-3001', model:'Bella+Canvas 3001', description:'A classic, easy fit. Soft ring-spun cotton, a crew neck, and room to move.', material:'100% combed, ring-spun cotton', chest:[34,38,43,46],length:[28,29,30,31]},
  fitted: {name:'Fitted', sku:'GLOBAL-TEE-BC-6004', model:'Bella+Canvas 6004', description:'A closer silhouette with a shaped waist and shorter sleeves. Size up for a little more room.', material:'Cotton blend; composition varies by supply region',chest:[32,33.5,35.5,37.5],length:[26.25,26.75,27.375,28]}
} as const;
export const orderSchema = z.object({fit:z.enum(['unisex','fitted']),size:z.enum(SIZES),timestamp:z.number().int().min(1000000000000).max(9999999999999),requestId:z.uuid()}).strict();
export type Fit = keyof typeof catalog;
export function formatMoment(timestamp:number) {return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'UTC',hour12:false}).format(timestamp)+' UTC';}
export function money(cents:number) {return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(cents/100);}
