import {prodigi,publicOrder} from '@/lib/prodigi';
import {AppError,authorizeOrder,fail,guard,json} from '@/lib/security';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{guard(request,60);const {id}=await params;if(!/^ord_[a-zA-Z0-9_-]{1,100}$/.test(id))throw new AppError('Order not found.',404);authorizeOrder(request,id);const data=await prodigi(`/orders/${id}`);if(!data.order)throw new AppError('Order not found.',404);return json({order:publicOrder(data.order)});}catch(error){return fail(error)}}
