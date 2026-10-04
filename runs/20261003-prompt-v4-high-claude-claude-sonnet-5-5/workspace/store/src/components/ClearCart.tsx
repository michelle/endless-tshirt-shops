"use client";
import { useEffect } from "react";
import { clearCart } from "@/lib/cart";
export function ClearCart() { useEffect(() => { clearCart(); }, []); return null; }
