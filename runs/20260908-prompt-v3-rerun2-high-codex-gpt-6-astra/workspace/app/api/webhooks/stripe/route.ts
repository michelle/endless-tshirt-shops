import {NextRequest,NextResponse} from 'next/server';
import {stripe,fulfill} from '@/lib/server';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(req:NextRequest){
 const sig=req.headers.get('stripe-signature');if(!sig||!process.env.STRIPE_WEBHOOK_SECRET)return NextResponse.json({error:'Webhook not configured or missing signature'},{status:400});
 let event;try{event=stripe().webhooks.constructEvent(await req.text(),sig,process.env.STRIPE_WEBHOOK_SECRET);}catch{return NextResponse.json({error:'Invalid signature'},{status:400});}
 try{if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){const s=event.data.object as any;if(s.metadata?.store==='daymark-v1')await fulfill(s.id);}return NextResponse.json({received:true});}catch(e){console.error('Fulfillment retry required',event.id,e instanceof Error?e.message:'unknown');return NextResponse.json({error:'Fulfillment pending; retry required'},{status:500});}
}
