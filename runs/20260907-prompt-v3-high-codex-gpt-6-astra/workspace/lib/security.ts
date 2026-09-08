import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {AppError} from './config';
function secret(){const key=process.env.ART_SIGNING_SECRET;if(!key||key.length<32)throw new AppError('Print security is not configured.',503);return key;}
export function sign(value:string){return createHmac('sha256',secret()).update(value).digest('base64url');}
export function equal(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function encodeArt(design:unknown){const payload=Buffer.from(JSON.stringify({v:1,design})).toString('base64url');return payload+'.'+sign('art-v1:'+payload);}
export function decodeArt(token:string){if(token.length>1800)throw new AppError('Invalid artwork link.',403);const [payload,sig,...extra]=token.split('.');if(!payload||!sig||extra.length||!equal(sig,sign('art-v1:'+payload)))throw new AppError('Invalid artwork link.',403);const decoded=JSON.parse(Buffer.from(payload,'base64url').toString());if(decoded.v!==1||!decoded.design)throw new AppError('Unsupported artwork version.',403);return decoded.design;}
export function idempotencyKey(id:string){const h=createHash('sha256').update('personal-orbit:'+id).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
