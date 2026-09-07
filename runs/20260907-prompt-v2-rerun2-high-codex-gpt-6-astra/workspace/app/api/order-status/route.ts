import {verify,prodigi,json,failure,readBody,StoreError} from '@/lib/commerce';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(req:Request){try{
 const body=await readBody(req);const token=verify(body.receipt);
 if(token.kind!=='order'||typeof token.id!=='string'||!/^ord_[a-zA-Z0-9_-]+$/.test(token.id))throw new StoreError('Invalid order receipt.',403);
 const data=await prodigi(`orders/${encodeURIComponent(token.id)}`);const o=data.order;
 if(!o)throw new StoreError('Order not found.',404);
 return json({id:o.id,reference:o.merchantReference,created:o.created,stage:o.status.stage,details:o.status.details,hasIssues:!!o.status.issues?.length,items:o.items.map((i:any)=>({reference:i.merchantReference,quantity:i.copies,size:i.attributes.size,color:i.attributes.color,status:i.status})),shipments:(o.shipments||[]).map((s:any)=>({carrier:s.carrier?.name,trackingNumber:s.tracking?.number,trackingUrl:s.tracking?.url})),mode:'sandbox'});
 }catch(e){return failure(e);}}
