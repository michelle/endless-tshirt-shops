import {config,ready} from '../../../lib/store';
export function GET(){return Response.json({checkoutReady:ready(),mode:config().STORE_MODE==='live'?'live':'sandbox',price:4200,shipping:600,currency:'USD'});}
