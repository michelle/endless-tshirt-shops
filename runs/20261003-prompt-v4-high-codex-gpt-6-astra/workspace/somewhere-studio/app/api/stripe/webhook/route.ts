import {config,jsonError} from '../../../../lib/store';
import {fulfill,verifySignature} from '../../../../lib/payments';
export async function POST(req:Request){
 const secret=config().STRIPE_WEBHOOK_SECRET;if(!secret)return jsonError('Webhook not configured',503);
 const raw=await req.text();if(!await verifySignature(raw,req.headers.get('stripe-signature')||'',secret))return jsonError('Invalid signature',400);
 try{const event=JSON.parse(raw);if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
 if(event.data.object.payment_status==='paid')await fulfill(event.data.object.id);
 }return Response.json({received:true});}catch(e){console.error('fulfillment webhook failed',e instanceof Error?e.message:'unknown');return jsonError('Fulfillment pending retry',500);}
}
