import Stripe from 'stripe';
export class AppError extends Error { constructor(message:string,public status=400){super(message);} }
export function getOrigin(){
 const raw=process.env.APP_URL;
 if(!raw)throw new AppError('The store address is not configured yet.',503);
 const url=new URL(raw); if(url.protocol!=='https:'&&url.hostname!=='localhost')throw new AppError('Invalid store configuration.',503);
 return url.origin;
}
export function getStripe(){
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key)throw new AppError('Checkout is awaiting a Stripe test account connection. Your design is saved; no payment has been taken.',503);
 const live=process.env.PAYMENTS_MODE==='live';
 if(live?!/^(sk|rk)_live_/.test(key):!/^(sk|rk)_test_/.test(key))throw new AppError('Payment mode is not configured correctly.',503);
 if(live&&process.env.PRODIGI_ENV!=='live')throw new AppError('Live payment and fulfillment must be enabled together.',503);
 if(!live&&process.env.PRODIGI_ENV==='live')throw new AppError('Test payments cannot create live print orders.',503);
 return new Stripe(key,{maxNetworkRetries:2,timeout:20000});
}
export function assertOrigin(req:Request){const origin=req.headers.get('origin');if(origin!==getOrigin())throw new AppError('Please start checkout from the store.',403);}
export function apiError(e:unknown){if(e instanceof AppError)return Response.json({error:e.message},{status:e.status});console.error('Store request failed',e instanceof Error?e.name:'Unknown error');return Response.json({error:'The service is temporarily unavailable. Please try again. No additional payment is needed for order-status retries.'},{status:502});}
