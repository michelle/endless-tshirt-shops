import { parseCartItem, type CartItem } from "./design";

const KEY = "overhead-cart-v1";
export const CART_EVENT = "overhead-cart-change";

export function readCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return (Array.isArray(raw) ? raw : []).map(parseCartItem).filter(Boolean) as CartItem[];
  } catch {
    return [];
  }
}
export function writeCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}
export function addToCart(item: CartItem) {
  const items = readCart();
  const same = items.find((i) => JSON.stringify(i.design) === JSON.stringify(item.design) && i.size === item.size);
  if (same) same.qty = Math.min(10, same.qty + item.qty);
  else items.push(item);
  writeCart(items);
}
export const clearCart = () => writeCart([]);
