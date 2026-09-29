import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="status-page">
          <div className="status-card">
            <div className="spinner" />
            <p>Loading your order…</p>
          </div>
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}
