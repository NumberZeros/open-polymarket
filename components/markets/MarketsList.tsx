"use client";

/**
 * Markets List Component
 *
 * Displays a grid of market cards
 */

import { useState, useEffect, useCallback } from "react";
import { MarketCard } from "./MarketCard";
import { getMarkets, getSamplingMarkets } from "@/lib/polymarket/marketApi";
import type { Market } from "@/lib/polymarket/types";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

interface MarketsListProps {
  featured?: boolean;
  limit?: number;
}

export function MarketsList({ featured = false, limit = 20 }: MarketsListProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarkets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let data: Market[];
      if (featured) {
        data = await getSamplingMarkets();
      } else {
        const result = await getMarkets({ limit });
        data = result.data;
      }
      // Ensure data is always an array
      setMarkets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load markets:', err);
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setIsLoading(false);
    }
  }, [featured, limit]);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-[#ef4444] mb-4" />
        <p className="text-[#a1a1aa] mb-4">{error}</p>
        <button
          onClick={loadMarkets}
          className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-12 text-[#a1a1aa]">
        No markets found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {markets.map((market, index) => (
        <MarketCard key={market.condition_id || market.id || `market-${index}`} market={market} />
      ))}
    </div>
  );
}
