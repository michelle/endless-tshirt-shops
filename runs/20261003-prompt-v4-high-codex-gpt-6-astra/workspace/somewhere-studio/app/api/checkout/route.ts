import {bucket,config,db,jsonError,ready,sameOrigin} from '../../../lib/store';
import {sizes,validateDesign} from '../../../lib/design';
import {stripe} from '../../../lib/payments';
export async function POST(req:Request){
 if(!sameOrigin(req))return jsonError('Invalid origin',403);
 if(!ready())return jsonError('Checkout is not open yet. You can personalize and download your design while payment setup is completed.',503);
 if(Number(req.headers.get('content-length')||0)>26000000)return jsonError('Artwork is too large',413);
 try{
 const form=await req.formData();const design=validateDesign(JSON.parse(String(form.get('design'))));const size=String(form.get('size'));
 if(!sizes.includes(size as any))return jsonError('Please choose a valid size');
 const file=form.get('art');if(!(file instanceof File)||file.type!=='image/png'||file.size>25000000)return jsonError('A print-ready PNG is required');
 const bytes=await file.arrayBuffer();const v=new DataView(bytes);if(v.byteLength<24 || v.getUint32(0)!==0x89504e47 || v.getUint32(4)!==0x0d0a1a0a || v.getUint32(16)!==4677 || v.getUint32(20)!==5881)return jsonError('Artwork dimensions are invalid');
 const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();const now=Date.now();
 await bucket().put(id+'.png',bytes,{httpMetadata:{contentType:'image/png'}});
 await db().prepare('INSERT INTO orders (id,token,design,size,amount,currency,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,token,JSON.stringify(design),size,4800,'usd','pending',now,now).run();
 const origin=config().SITE_URL;const body=new URLSearchParams({mode:'payment','payment_method_types[0]':'card','line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':'4200','line_items[0][price_data][product_data][name]':'Somewhere Tee — '+design.place,'line_items[0][price_data][product_data][description]':'Personalized navy Bella+Canvas 3001 · '+size.toUpperCase(),'line_items[0][quantity]':'1','shipping_address_collection[allowed_countries][0]':'US','shipping_options[0][shipping_rate_data][type]':'fixed_amount','shipping_options[0][shipping_rate_data][fixed_amount][amount]':'600','shipping_options[0][shipping_rate_data][fixed_amount][currency]':'usd','shipping_options[0][shipping_rate_data][display_name]':'Standard shipping','metadata[order_id]':id,client_reference_id:id,success_url:origin+'/order?id='+id+'&token='+token,cancel_url:origin+'/?canceled=1'});
 const session=await stripe('checkout/sessions',body,id);
 await db().prepare('UPDATE orders SET session_id=?,updated_at=? WHERE id=?').bind(session.id,Date.now(),id).run();
 return Response.json({url:session.url});
 }catch(e){console.error('checkout failed',e instanceof Error?e.message:'unknown');return jsonError(e instanceof Error && e.message.startsWith('Please use')?e.message:'Unable to start checkout. Your design is still here; please try again.',500);}
}
