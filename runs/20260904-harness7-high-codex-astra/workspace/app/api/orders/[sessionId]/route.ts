import {stripe,assertOrigin} from '@/lib/config';
import {fulfillCheckout} from '@/lib/fulfillment';
import {prodigi,ProdigiOrder} from '@/lib/prodigi';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(_r:Request,{params}:{params:Promise<{sessionId:string}>}){const {sessionId}=await params;if(!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId))return Response.json({error:'Order not found'},{status:404});
 try{const s=await stripe().checkout.sessions.retrieve(sessionId);if(s.metadata?.shop!=='datetime.store')return Response.json({error:'Order not found'},{status:404});let stage='NotSubmitted',issues=false,tracking:{number?:string;url?:string}[]=[];
 if(s.metadata.prodigi_order_id){try{const result=await prodigi<{order:ProdigiOrder}>(`/orders/${s.metadata.prodigi_order_id}`);stage=result.order.status.stage;issues=Boolean(result.order.status.issues?.length);tracking=(result.order.shipments||[]).map(x=>x.tracking).filter((x):x is {number?:string;url?:string}=>Boolean(x))}catch{stage='StatusUnavailable'}}
 return Response.json({timestamp:s.metadata.timestamp,fit:s.metadata.fit,size:s.metadata.size,payment:s.payment_status,sessionStatus:s.status,total:s.amount_total,fulfillment:s.metadata.fulfillment_status,orderId:s.metadata.prodigi_order_id||null,stage,issues,tracking,sandbox:!s.livemode},{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}})
 }catch{return Response.json({error:'Order not found or temporarily unavailable'},{status:404})}
}
export async function POST(request:Request,{params}:{params:Promise<{sessionId:string}>}){try{assertOrigin(request)}catch{return Response.json({error:'Invalid origin'},{status:403})}const {sessionId}=await params;if(!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId))return Response.json({error:'Invalid order'},{status:400});try{await fulfillCheckout(sessionId);return Response.json({ok:true})}catch{return Response.json({error:'Your payment is being checked. If paid, your order will be retried automatically.'},{status:409})}}
