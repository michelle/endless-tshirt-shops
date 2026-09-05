import {stripe} from '@/lib/config';
import {fulfillCheckout} from '@/lib/fulfillment';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){const signature=request.headers.get('stripe-signature');if(!signature||!process.env.STRIPE_WEBHOOK_SECRET)return new Response('Invalid signature',{status:400});let event;
 try{event=stripe().webhooks.constructEvent(await request.text(),signature,process.env.STRIPE_WEBHOOK_SECRET)}catch{return new Response('Invalid signature',{status:400})}
 if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){const session=event.data.object;if(session.metadata?.shop==='datetime.store'&&session.payment_status==='paid'){try{await fulfillCheckout(session.id)}catch{return new Response('Fulfillment retry required',{status:500})}}}
 return Response.json({received:true});
}
