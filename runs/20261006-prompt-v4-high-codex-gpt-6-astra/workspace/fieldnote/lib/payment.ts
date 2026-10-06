export async function verifyStripeSignature(raw:string,header:string,secret:string,now=Date.now()) {
 const parts=header.split(',').map(p=>p.split('='));const timestamp=parts.find(p=>p[0]==='t')?.[1];
 if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300) return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const [,value] of parts.filter(p=>p[0]==='v1')) {if(!/^[a-f0-9]{64}$/.test(value||''))continue;const bytes=Uint8Array.from(value.match(/../g)!,x=>parseInt(x,16));if(await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(`${timestamp}.${raw}`)))return true;}
 return false;
}
export function assertPaid(session:any,order:any,live:boolean){
 if(session.payment_status!=='paid'||session.status!=='complete')throw Error('Payment has not succeeded.');
 if(session.id!==order.session_id||session.metadata?.order_id!==order.id||session.client_reference_id!==order.id||session.currency!=='usd'||session.amount_total!==order.total||session.livemode!==live)throw Error('Payment does not match this order.');
}
