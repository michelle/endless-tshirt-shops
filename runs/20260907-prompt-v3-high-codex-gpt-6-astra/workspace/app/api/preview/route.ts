import {designSchema} from '@/lib/design';
import {outlinedSvg} from '@/lib/artwork';
export const runtime='nodejs';
export async function GET(req:Request){try{const data=new URL(req.url).searchParams.get('design')||'';if(data.length>700)return new Response('Too large',{status:400});const parsed=designSchema.safeParse(JSON.parse(data));if(!parsed.success)return new Response('Invalid design',{status:400});return new Response(outlinedSvg(parsed.data),{headers:{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=86400','Content-Security-Policy':"default-src 'none'; sandbox"}});}catch{return new Response('Invalid design',{status:400});}}
