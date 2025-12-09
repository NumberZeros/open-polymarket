import { useState, useEffect } from "react";
import { getMarkets } from "@/lib/polymarket/marketApi";
import type { Market } from "@/lib/polymarket/types";

/**
 * Fetch active (non-closed) markets from Polymarket
 * 
 * Uses official Polymarket Gamma API:
 * @see https://docs.polymarket.com/api-reference/markets/list-markets
 * 
 * Filters to:
 * - Active markets only (not closed)
 * - Markets accepting orders
 * - Sorted by volume (most traded first)
 */
export function useActiveMarkets(limit: number = 100) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("[useActiveMarkets] Fetching active markets from Gamma API...");
        
        // Fetch from official Polymarket Gamma API
        // Automatically filters to non-closed markets, ordered by volume
        const result = await getMarkets({
          limit,
          offset: 0,
          closed: false,  // Only active markets
          order: "volumeNum",  // Order by trading volume
          ascending: false,  // Most active first
        });
        
        // Additional filter: markets accepting orders
        const activeMarkets = (result.data || []).filter(
          (m: any) => m.acceptingOrders !== false
        );

        console.log("[useActiveMarkets] Fetched active markets:", activeMarkets.length);
        setMarkets(activeMarkets);
      } catch (err: any) {
        console.error("[useActiveMarkets] Error:", err);
        setError(err?.message || "Failed to fetch markets");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkets();
  }, [limit]);

  return {
    markets,
    isLoading,
    error,
  };
}
