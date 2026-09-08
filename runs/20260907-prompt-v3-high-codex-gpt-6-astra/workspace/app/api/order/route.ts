import {apiError,AppError,assertOrigin} from '@/lib/config';
import {equal} from '@/lib/security';
import {fulfill,readOrder,retrieveSession} from '@/lib/fulfillment';
import {getPrintOrder,PrintOrder} from '@/lib/prodigi';
export const runtime='nodejs';
async function handle(req:Request,submit:boolean){try{
 if(submit)assertOrigin(req);
 const url=new URL(req.url),id=url.searchParams.get('session_id')||'',token=req.headers.get('x-order-token')||'';
 const session=await retrieveSession(id);
 if(!token||!session.metadata?.access_token||!equal(token,session.metadata.access_token))throw new AppError('This private order link is invalid. Use the link provided after checkout.',403);
 const order=readOrder(session); let print:PrintOrder|undefined,warning:string|undefined;
 try{if(session.metadata?.prodigi_order_id)print=await getPrintOrder(session.metadata.prodigi_order_id);else if(submit&&session.payment_status==='paid')print=await fulfill(id);}catch{warning='Payment is recorded. Print confirmation is delayed. Refresh the status; this will not charge you again.';}
 return Response.json({reference:id.slice(-10).toUpperCase(),payment:session.payment_status,total:session.amount_total,currency:session.currency,...order,print:print?{id:print.id,stage:print.status.stage,needsAttention:Boolean(print.status.issues?.length),tracking:(print.shipments||[]).map(s=>({number:s.tracking?.number,url:s.tracking?.url})).filter(t=>t.number||t.url)}:null,warning,testMode:!session.livemode},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return apiError(e);}}
export function GET(req:Request){return handle(req,false);}
export function POST(req:Request){return handle(req,true);}
