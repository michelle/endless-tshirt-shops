import {AppError} from './config';
import {SKU} from './design';
export interface PrintOrder { id:string; status:{stage:string;issues?:unknown[];details?:Record<string,string>}; shipments?:{tracking?:{number?:string;url?:string};carrier?:{name?:string}}[]; }
export async function prodigi<T>(path:string,body?:unknown):Promise<T>{
 const key=process.env.PRODIGI_API_KEY;if(!key)throw new AppError('The print service is not connected yet.',503);
 const live=process.env.PRODIGI_ENV==='live';
 if(live&&process.env.PAYMENTS_MODE!=='live')throw new AppError('Test payments cannot create live print orders.',503);
 const response=await fetch(`https://api.${live?'':'sandbox.'}prodigi.com/v4.0/${path}`,{method:body?'POST':'GET',headers:{'X-API-Key':key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000),cache:'no-store'});
 const data=await response.json();if(!response.ok){console.error('Prodigi request failed',{status:response.status,code:data.outcome});throw new AppError('The print service could not process this request. Please retry shortly.',502);}return data;
}
export async function checkAvailability(size:string,quantity:number){
 const result=await prodigi<{quotes?:unknown[]}>('quotes',{shippingMethod:'Standard',destinationCountryCode:'US',currencyCode:'USD',items:[{sku:SKU,copies:quantity,attributes:{color:'black',size},assets:[{printArea:'front'}]}]});
 if(!result.quotes?.length)throw new AppError('This size is temporarily unavailable for US delivery. Please try another size.',409);
}
export async function getPrintOrder(id:string){if(!/^ord_[a-zA-Z0-9_-]+$/.test(id))throw new AppError('Invalid print order.',400);return (await prodigi<{order:PrintOrder}>(`orders/${id}`)).order;}
