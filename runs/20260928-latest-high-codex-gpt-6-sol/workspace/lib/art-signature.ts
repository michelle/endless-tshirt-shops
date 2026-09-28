import { createHmac } from 'crypto';
export function signArt(data:string):string {
  if (!process.env.ART_SIGNING_SECRET) throw new Error('Artwork signing is not configured');
  return createHmac('sha256',process.env.ART_SIGNING_SECRET).update(data).digest('hex');
}
