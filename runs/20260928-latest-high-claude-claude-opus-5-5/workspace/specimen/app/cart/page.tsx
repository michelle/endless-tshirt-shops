import type { Metadata } from "next";
import { Cart } from "@/components/CartView";

export const metadata: Metadata = { title: "Your bag — SPECIMEN" };

export default async function CartPage({ searchParams }: PageProps<"/cart">) {
  const { canceled } = await searchParams;
  return (
    <main className="wrap">
      <Cart canceled={canceled === "1"} />
    </main>
  );
}
