import {NextRequest,NextResponse} from 'next/server';
import {stripe,fulfill} from '../../../../lib/server';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(req:NextRequest){
 let event;
 try{const sig=req.headers.get('stripe-signature');if(!sig||!process.env.STRIPE_WEBHOOK_SECRET)throw Error('Missing signature');event=stripe().webhooks.constructEvent(await req.text(),sig,process.env.STRIPE_WEBHOOK_SECRET);}catch{return NextResponse.json({error:'Invalid webhook signature'},{status:400});}
 if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
  try{await fulfill(event.data.object.id);}catch(e){console.error('fulfillment_failed',event.id,e instanceof Error?e.message:'Unknown error');return NextResponse.json({error:'Fulfillment pending; retry required'},{status:500});}
 }
 return NextResponse.json({received:true});
}
