import { env } from "cloudflare:workers";
import { fulfillPaidOrder } from "@/lib/store";

export const runtime = "edge";

function equalHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response("Webhook is not configured", { status: 503 });
  const raw = await request.text();
  const header = request.headers.get("stripe-signature") || "";
  const timestamp = header.match(/(?:^|,)t=(\d+)/)?.[1];
  const signatures = [...header.matchAll(/(?:^|,)v1=([a-f0-9]+)/g)].map(x => x[1]);
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !signatures.length) {
    return new Response("Invalid signature", { status: 400 });
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  const expected = [...new Uint8Array(signed)].map(x => x.toString(16).padStart(2, "0")).join("");
  if (!signatures.some(signature => equalHex(signature, expected))) return new Response("Invalid signature", { status: 400 });
  const event = JSON.parse(raw);
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    const id = event.data?.object?.metadata?.order_id;
    if (typeof id === "string" && /^[0-9a-f-]{36}$/.test(id)) {
      const result = await fulfillPaidOrder(id, new URL(request.url).origin);
      if (result.status === "fulfillment_failed") return new Response("Fulfillment retry needed", { status: 500 });
    }
  }
  return new Response("ok");
}
