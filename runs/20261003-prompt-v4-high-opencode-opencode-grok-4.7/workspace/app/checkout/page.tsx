import { CheckoutForm } from "@/components/CheckoutForm";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const params = await searchParams;
  return <CheckoutForm cancelled={params.cancelled === "1"} />;
}
