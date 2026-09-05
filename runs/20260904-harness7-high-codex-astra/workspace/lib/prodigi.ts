import {catalog,Fit} from './catalog';
import {isSandbox} from './config';
export interface ProdigiOrder {id:string;status:{stage:string;issues:unknown[];details:Record<string,string>};shipments?:{tracking?:{number?:string;url?:string}}[];items?:{assets?:{url:string;status?:string}[]}[]}
export async function prodigi<T>(path:string,body?:unknown):Promise<T>{
 const key=process.env.PRODIGI_API_KEY;if(!key)throw new Error('Prodigi is not configured');
 if(!isSandbox()&&process.env.ENABLE_LIVE_ORDERS!=='true')throw new Error('Live fulfillment is disabled');
 const base=isSandbox()?'https://api.sandbox.prodigi.com/v4.0':'https://api.prodigi.com/v4.0';
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'X-API-Key':key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await r.json();if(!r.ok){console.error('prodigi_api_error',{status:r.status,outcome:data.outcome,issues:data.issues?.map((i:{errorCode:string})=>i.errorCode)});throw new Error('The print service could not process this request')};return data;
}
export async function quote(fit:Fit,size:string){const data=await prodigi<{quotes?:{shipmentMethod:string;costSummary:{totalCost:{amount:string}}}[];issues?:{errorCode:string}[]}>('/quotes',{shippingMethod:'Standard',destinationCountryCode:'US',currencyCode:'USD',items:[{sku:catalog[fit].sku,copies:1,attributes:{color:'black',size:size.toLowerCase()},assets:[{printArea:'front'}]}]});
 const blocking=data.issues?.filter(i=>i.errorCode!=='destinationCountryCode.UsSalesTaxWarning');
 if(blocking?.length||!data.quotes?.length)throw new Error('This size cannot currently be shipped. Please try another size.');return data.quotes[0];}
