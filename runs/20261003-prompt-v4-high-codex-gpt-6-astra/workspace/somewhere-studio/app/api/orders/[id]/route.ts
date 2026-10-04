import {getOrder,jsonError} from '../../../../lib/store';
import {fulfill} from '../../../../lib/payments';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 try{const {id}=await params;let o=await getOrder(id);if(!o||new URL(req.url).searchParams.get('token')!==o.token)return jsonError('Order not found',404);
 if(o.session_id&&!o.prodigi_id){try{await fulfill(o.session_id);o=(await getOrder(id))!;}catch{/* Pending payments are never fulfilled. Webhooks retry provider failures. */}}
 return Response.json({id:o.id,status:o.status,design:JSON.parse(o.design),size:o.size,amount:o.amount,prodigiId:o.prodigi_id},{headers:{'Cache-Control':'no-store'}});
 }catch{return jsonError('Order status is temporarily unavailable. Please reload.',503);}
}
