"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MarketDetailClient } from "./MarketDetailClient";
import { getMarketBySlug } from "@/lib/polymarket/marketApi";
import type { Market } from "@/lib/polymarket/types";

interface MarketPageProps {
  params: Promise<{ id: string }>;
}

export default function MarketPage({ params }: MarketPageProps) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string>("");

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const { id: slugId } = await params;
        setId(slugId);
        
        const marketData = await getMarketBySlug(slugId);
        if (!marketData) {
          setError("Market not found");
          return;
        }
        
        setMarket(marketData);
      } catch (err) {
        console.error("[MarketPage] Error fetching market:", err);
        setError("Failed to load market");
      } finally {
        setLoading(false);
      }
    };

    fetchMarket();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-[#a1a1aa]">Loading market...</div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-[#ef4444]">{error || "Market not found"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <MarketDetailClient market={market} />
    </div>
  );
}
