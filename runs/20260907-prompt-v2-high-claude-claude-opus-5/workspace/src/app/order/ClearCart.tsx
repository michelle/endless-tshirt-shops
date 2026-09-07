'use client';
import { useEffect } from 'react';
import { useCart } from '@/components/CartProvider';

/** The order is placed; drop the local cart so a refresh does not re-offer it. */
export default function ClearCart() {
  const { clear, ready, count } = useCart();
  useEffect(() => { if (ready && count > 0) clear(); }, [ready, count, clear]);
  return null;
}
