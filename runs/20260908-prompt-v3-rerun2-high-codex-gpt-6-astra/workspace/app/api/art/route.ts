import {NextRequest,NextResponse} from 'next/server';
import sharp from 'sharp';
import {designSchema,artwork} from '@/lib/design';
import {verify} from '@/lib/server';
export const runtime='nodejs';
export async function GET(req:NextRequest){try{const data=req.nextUrl.searchParams.get('data')||'',sig=req.nextUrl.searchParams.get('sig')||'';if(data.length>2000||!verify(data,sig))return new NextResponse('Invalid artwork signature',{status:403});const d=designSchema.parse(JSON.parse(Buffer.from(data,'base64url').toString()));const png=await sharp(Buffer.from(artwork(d))).png().withMetadata({density:300}).toBuffer();return new NextResponse(new Uint8Array(png),{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=31536000, immutable'}});}catch{return new NextResponse('Invalid artwork',{status:400});}}
