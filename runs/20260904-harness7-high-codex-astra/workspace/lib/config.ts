import Stripe from 'stripe';
export function isSandbox(){return process.env.SHOP_MODE !== 'live'}
export function appUrl(){const value=process.env.APP_URL;if(!value)throw new Error('APP_URL is not configured');return value.replace(/\/$/,'')}
export function stripe(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error('Stripe is not configured');if(isSandbox()&&!key.includes('_test_'))throw new Error('Sandbox requires a test Stripe key');if(!isSandbox()&&(!key.includes('_live_')||process.env.ENABLE_LIVE_ORDERS!=='true'))throw new Error('Live ordering is not enabled');return new Stripe(key,{maxNetworkRetries:2,timeout:15000})}
export function assertOrigin(request:Request){const origin=request.headers.get('origin');const allowed=[appUrl(),...(process.env.NODE_ENV==='development'?['http://localhost:3000','http://127.0.0.1:3000']:[])];if(origin&&!allowed.includes(origin))throw new Error('Invalid origin')}
