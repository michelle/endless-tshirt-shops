import Storefront from "@/components/storefront";

export default async function Home({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const query = await searchParams;
  return <Storefront checkoutCancelled={query.checkout === "cancelled"} />;
}
