import { Suspense } from "react";
import OrderStatusClient from "./OrderStatusClient";

export default function OrderStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="container">
          <h1>Order status</h1>
        </div>
      }
    >
      <OrderStatusClient />
    </Suspense>
  );
}
