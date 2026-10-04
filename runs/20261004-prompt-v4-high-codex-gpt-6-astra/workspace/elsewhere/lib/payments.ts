export async function stripeRequest(key: string, path: string, params?: URLSearchParams, idempotency?: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? 'POST':'GET',
    headers: {'Authorization':`Bearer ${key}`,'Stripe-Version':'2025-02-24.acacia',...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},
    body: params, signal: AbortSignal.timeout(20000),
  });
  const result:any=await res.json();
  if (!res.ok) { console.error('Stripe request failed',res.status,result.error?.code); throw new Error('Payment service is temporarily unavailable. Please try again.'); }
  return result;
}
export async function verifyWebhook(raw: string, signature: string, secret: string, now = Date.now()) {
  const parts=signature.split(','), time=parts.find(x=>x.startsWith('t='))?.slice(2);
  if (!time || !/^\d+$/.test(time) || Math.abs(now/1000-Number(time))>300) return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${time}.${raw}`));
  const hex=Array.from(new Uint8Array(signed)).map(n=>n.toString(16).padStart(2,'0')).join('');
  return parts.filter(x=>x.startsWith('v1=')).some(x=>{
    const candidate=x.slice(3); if(candidate.length!==hex.length)return false;
    let diff=0; for(let i=0;i<hex.length;i++)diff|=hex.charCodeAt(i)^candidate.charCodeAt(i); return diff===0;
  });
}
export function assertPaid(session:any, order:any, live:boolean) {
  if(session.payment_status!=='paid' || session.status!=='complete') return false;
  if(session.id!==order.session_id || session.client_reference_id!==order.id || session.metadata?.order_id!==order.id || session.mode!=='payment' || session.currency!==order.currency || session.amount_total!==order.amount || session.livemode!==live) throw new Error('Payment verification failed. Your order needs review.');
  return true;
}
