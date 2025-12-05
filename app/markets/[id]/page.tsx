import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MarketDetailClient } from "./MarketDetailClient";
import { getMarket } from "@/lib/polymarket/marketApi";

interface MarketPageProps {
  params: Promise<{ id: string }>;
}

export default async function MarketPage({ params }: MarketPageProps) {
  const { id } = await params;
  
  // Fetch market data server-side
  const market = await getMarket(id);
  
  if (!market) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <Header />
      <MarketDetailClient market={market} />
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: MarketPageProps) {
  const { id } = await params;
  const market = await getMarket(id);
  
  if (!market) {
    return { title: "Market Not Found" };
  }

  return {
    title: `${market.question} | BetHub`,
    description: market.description || market.question,
  };
}
