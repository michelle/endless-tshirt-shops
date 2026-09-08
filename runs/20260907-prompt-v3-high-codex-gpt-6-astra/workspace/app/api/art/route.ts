import {decodeArt} from '@/lib/security';
import {designSchema} from '@/lib/design';
import {printPng} from '@/lib/artwork';
import {apiError} from '@/lib/config';
export const runtime='nodejs';
export async function GET(req:Request){try{const d=designSchema.parse(decodeArt(new URL(req.url).searchParams.get('token')||''));return new Response(new Uint8Array(await printPng(d)),{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=31536000, immutable','Content-Disposition':'inline; filename="personal-orbit-front.png"'}});}catch(e){return apiError(e);}}
