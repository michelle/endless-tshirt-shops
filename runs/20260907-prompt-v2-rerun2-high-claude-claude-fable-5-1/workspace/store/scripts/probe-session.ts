import { retrieveSession, fulfilSession } from "../src/lib/fulfil";
import { buildOrderItems } from "../src/lib/prodigi";
import { decodeItems } from "../src/lib/cart-items";
(async () => {
  const s = await retrieveSession(process.argv[2]);
  console.log("payment_status", s.payment_status, "metadata", s.metadata);
  console.log("shipping", JSON.stringify(s.collected_information?.shipping_details), "phone", s.customer_details?.phone);
  console.log("rate", JSON.stringify(s.shipping_cost?.shipping_rate && typeof s.shipping_cost.shipping_rate !== "string" ? s.shipping_cost.shipping_rate.metadata : s.shipping_cost));
  console.log("items", JSON.stringify(buildOrderItems(decodeItems(s.metadata?.items || ""))));
  try { const r = await fulfilSession(s); console.log("OK", r.outcome, r.order.id, r.order.status?.stage); } catch (e) { console.log("FAIL", String(e)); }
})();
