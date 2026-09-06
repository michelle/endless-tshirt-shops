import {NextRequest,NextResponse} from 'next/server';
import {stripe,prodigi} from '../../../lib/server';
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get('session_id');const headers={'Cache-Control':'private, no-store'};
 if(!id||!/^cs_test_[A-Za-z0-9]{20,240}$/.test(id))return NextResponse.json({error:'Invalid order link'},{status:400,headers});
 try{const s=await stripe().checkout.sessions.retrieve(id);if(s.metadata?.store!=='night-shift-v1')return NextResponse.json({error:'Order not found'},{status:404,headers});
 if(s.payment_status!=='paid')return NextResponse.json({payment:s.payment_status,stage:'Awaiting payment'},{headers});
 const orderId=s.metadata?.prodigiOrderId;let stage='Waiting for the print partner',tracking:string|null=null,issues=false;
 if(orderId){try{const d=await prodigi('/orders/'+encodeURIComponent(orderId));stage=d.order?.status?.stage||'Submitted';issues=Boolean(d.order?.status?.issues?.length);const u=d.order?.shipments?.[0]?.tracking?.url;tracking=typeof u==='string'&&u.startsWith('https://')?u:null;}catch{stage='Submitted — status temporarily unavailable';}}
 return NextResponse.json({payment:'paid',stage,orderId:orderId||null,reference:s.metadata.orderRef?.slice(0,8).toUpperCase(),amount:s.amount_total,items:JSON.parse(s.metadata.cart||'[]'),tracking,issues,test:true},{headers});
 }catch{return NextResponse.json({error:'Unable to find this order. Check your confirmation link or try again.'},{status:404,headers});}
}
