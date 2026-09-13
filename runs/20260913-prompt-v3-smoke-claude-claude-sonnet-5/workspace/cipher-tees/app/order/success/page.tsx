import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container">
          <h1>Loading your order…</h1>
        </div>
      }
    >
      <OrderSuccessClient />
    </Suspense>
  );
}
