import Storefront from './storefront';
export default function Page(){return <Storefront sandbox={process.env.PRODIGI_ENV!=='live'} paymentsReady={!!process.env.STRIPE_SECRET_KEY}/>}
