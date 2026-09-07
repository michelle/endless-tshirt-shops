import type { ShirtColor, ShirtSize } from "./designs";

export type CartItem = {
  slug: string;
  name: string;
  jobTitle: string;
  price: number;
  color: ShirtColor["key"];
  size: ShirtSize;
  qty: number;
};

export function cartItemKey(item: Pick<CartItem, "slug" | "color" | "size">) {
  return `${item.slug}__${item.color}__${item.size}`;
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}
