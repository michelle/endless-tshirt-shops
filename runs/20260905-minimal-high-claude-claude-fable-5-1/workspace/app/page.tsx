import Store from "@/components/Store";

export default function Home() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  return <Store publishableKey={publishableKey} />;
}
