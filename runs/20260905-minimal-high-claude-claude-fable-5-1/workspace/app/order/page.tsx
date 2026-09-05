import { Suspense } from "react";
import OrderStatus from "./OrderStatus";

export const metadata = { title: "Your order · datetime.store" };

export default function OrderPage() {
  return (
    <main className="container order-page">
      <h1>
        <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
          datetime.store
        </a>
      </h1>
      <Suspense fallback={<p>Loading your order…</p>}>
        <OrderStatus />
      </Suspense>
    </main>
  );
}
