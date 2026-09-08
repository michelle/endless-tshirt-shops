import type { TeeOrder } from "./order";
function secret() { return process.env.ORDER_SIGNING_SECRET || process.env.PRODIGI_API_KEY || "development-only-secret"; }
const encoder = new TextEncoder();
const base64url = (value:string) => Buffer.from(value).toString("base64url");
export async function createArtworkToken(order:TeeOrder) { const payload=base64url(JSON.stringify(order)); const key=await crypto.subtle.importKey("raw",encoder.encode(secret()),{name:"HMAC",hash:"SHA-256"},false,["sign"]); const signature=await crypto.subtle.sign("HMAC",key,encoder.encode(payload)); return `${payload}.${Buffer.from(signature).toString("base64url")}`; }
export async function readArtworkToken(token:string):Promise<TeeOrder|null> { try { const [payload,signature]=token.split("."); if(!payload||!signature)return null; const key=await crypto.subtle.importKey("raw",encoder.encode(secret()),{name:"HMAC",hash:"SHA-256"},false,["verify"]); const ok=await crypto.subtle.verify("HMAC",key,Buffer.from(signature,"base64url"),encoder.encode(payload)); if(!ok)return null; return JSON.parse(Buffer.from(payload,"base64url").toString()) as TeeOrder; } catch { return null; } }
