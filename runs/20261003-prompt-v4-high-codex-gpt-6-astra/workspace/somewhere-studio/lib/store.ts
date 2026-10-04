import { env } from 'cloudflare:workers';
export type Order = {id:string;token:string;design:string;size:string;amount:number;currency:string;status:string;session_id:string|null;recipient:string|null;prodigi_id:string|null;error:string|null;created_at:number;updated_at:number};
export function db(){if(!env.DB)throw new Error('Order storage unavailable');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('Artwork storage unavailable');return env.BUCKET;}
export function config(){return env as unknown as Record<string,string>;}
export async function getOrder(id:string){return db().prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Order>();}
export function jsonError(message:string,status=400){return Response.json({error:message},{status});}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
export function ready(){const e=config();return !!e.STRIPE_SECRET_KEY && !!e.STRIPE_WEBHOOK_SECRET && !!e.PRODIGI_API_KEY && (e.STORE_MODE==='live' ? e.STRIPE_SECRET_KEY.startsWith('sk_live_') && e.PRODIGI_MODE==='live' : e.STRIPE_SECRET_KEY.startsWith('sk_test_') && e.PRODIGI_MODE!=='live');}
