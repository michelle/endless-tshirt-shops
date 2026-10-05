export function assertPaid(session:any, order:{id:string;session:string|null;amount:number},live:boolean){
 if(session.payment_status!=='paid'||session.status!=='complete')throw new Error('Payment is not complete.');
 if(session.id!==order.session||session.metadata?.order_id!==order.id||session.client_reference_id!==order.id)throw new Error('Payment order mismatch.');
 if(session.currency!=='usd'||session.amount_subtotal!==order.amount||session.amount_total<order.amount)throw new Error('Payment amount mismatch.');
 if(session.livemode!==live)throw new Error('Payment environment mismatch.');
}
export async function validSignature(payload:string,header:string,secret:string,now=Date.now()){
 const parts=header.split(',').map(s=>s.split('='));const t=parts.find(p=>p[0]==='t')?.[1];if(!t||!/^\d+$/.test(t)||Math.abs(now/1000-Number(t))>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const p of parts.filter(p=>p[0]==='v1')){if(!/^[a-f0-9]{64}$/.test(p[1]))continue;const sig=Uint8Array.from(p[1].match(/../g)!,s=>parseInt(s,16));if(await crypto.subtle.verify('HMAC',key,sig,new TextEncoder().encode(`${t}.${payload}`)))return true;}return false;
}
