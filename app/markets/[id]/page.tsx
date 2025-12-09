"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { MarketDetailClient } from "./MarketDetailClient";
import { getMarketBySlug, getMarket } from "@/lib/polymarket/marketApi";
import type { Market } from "@/lib/polymarket/types";

interface MarketPageProps {
  params: Promise<{ id: string }>;
}

export default function MarketPage({ params }: MarketPageProps) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const { id: slugId } = await params;
        
        // Detect if it's a condition_id (hash starting with 0x) or a slug
        const isConditionId = slugId.startsWith("0x") && slugId.length === 66; // 0x + 64 hex chars
        
        let marketData: Market | null = null;
        
        if (isConditionId) {
          console.log("[MarketPage] Fetching by condition_id:", slugId);
          marketData = await getMarket(slugId);
        } else {
          console.log("[MarketPage] Fetching by slug:", slugId);
          marketData = await getMarketBySlug(slugId);
        }
        
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
