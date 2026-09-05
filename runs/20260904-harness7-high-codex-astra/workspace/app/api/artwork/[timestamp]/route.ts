import {artwork} from '@/lib/artwork';
export const runtime='nodejs';
export async function GET(_r:Request,{params}:{params:Promise<{timestamp:string}>}){const {timestamp}=await params;const stamp=timestamp.replace(/\.png$/,'');if(!/^\d{13}$/.test(stamp))return new Response('Invalid artwork',{status:400});const png=await artwork(stamp);return new Response(new Uint8Array(png),{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=31536000, immutable','Content-Disposition':`inline; filename="datetime-${stamp}.png"`}})}
