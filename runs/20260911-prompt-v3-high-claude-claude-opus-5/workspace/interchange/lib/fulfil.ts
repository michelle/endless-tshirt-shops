import { artUrl } from "./art";
import { createOrder, findByReference, ProdigiAddress, ProdigiOrder, TEE_SKU } from "./prodigi";
import { SHIPPING, ShippingOptionId } from "./pricing";
import { Spec, serialOf } from "./spec";

export type PaidOrder = {
  ref: string;
  spec: Spec;
  qty: number;
  shipping: ShippingOptionId;
  origin: string;
  email?: string;
  recipient: { name: string; phone?: string; address: ProdigiAddress };
  paymentRef: string;
  amountCents: number;
};

/**
 * Turn a *paid* order into a print job. Safe to call more than once: Prodigi is
 * asked first whether it already holds an order with this merchant reference,
 * and the reference doubles as the idempotency key on create.
 */
export async function fulfil(o: PaidOrder): Promise<{ order: ProdigiOrder; alreadyExisted: boolean }> {
  const existing = await findByReference(o.ref);
  if (existing) return { order: existing, alreadyExisted: true };

  const assets = [{ printArea: "front", url: artUrl(o.origin, o.spec, "front") }];
  if (o.spec.backPrint) assets.push({ printArea: "back", url: artUrl(o.origin, o.spec, "back") });

  const order = await createOrder({
    merchantReference: o.ref,
    shippingMethod: SHIPPING[o.shipping].prodigiMethod,
    recipient: {
      name: o.recipient.name,
      email: o.email,
      phoneNumber: o.recipient.phone,
      address: o.recipient.address,
    },
    items: [
      {
        merchantReference: `${o.ref}-tee`,
        sku: TEE_SKU,
        copies: o.qty,
        attributes: { color: o.spec.garment, size: o.spec.size },
        assets,
      },
    ],
    metadata: {
      store: "interchange",
      serial: serialOf(o.spec),
      paymentRef: o.paymentRef,
      amountPaidCents: o.amountCents,
      title: o.spec.title,
    },
  });

  return { order, alreadyExisted: false };
}
