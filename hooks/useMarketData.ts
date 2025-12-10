/**
 * React Query hooks for Market Data (Charts, OrderBook, Trades)
 * 
 * Provides cached data for price history, order books, and trade history
 */

import { useQuery } from "@tanstack/react-query";
import { getPriceHistory, getOrderBook, getMarketTrades } from "@/lib/polymarket/marketApi";
import { CACHE_TIMES, CACHE_GARBAGE_COLLECTION_TIMES, REFETCH_INTERVALS } from "@/lib/constants";
import type { OrderBook, Trade } from "@/lib/polymarket/types";

// ============= Query Keys =============

export const marketDataKeys = {
  all: ["marketData"] as const,
  priceHistory: (tokenId: string, interval: string, fidelity: number) => 
    [...marketDataKeys.all, "priceHistory", tokenId, interval, fidelity] as const,
  orderBook: (tokenId: string) => 
    [...marketDataKeys.all, "orderBook", tokenId] as const,
  trades: (marketId: string, limit: number) => 
    [...marketDataKeys.all, "trades", marketId, limit] as const,
};

// ============= Types =============

interface UsePriceHistoryOptions {
  tokenId: string;
  interval: string;
  fidelity: number;
  enabled?: boolean;
}

interface UseOrderBookOptions {
  tokenId: string;
  enabled?: boolean;
}

interface UseTradesOptions {
  marketId: string;
  limit?: number;
  enabled?: boolean;
}

// ============= Hooks =============

/**
 * Fetch price history for a token
 */
export function usePriceHistory({ 
  tokenId, 
  interval, 
  fidelity, 
  enabled = true 
}: UsePriceHistoryOptions) {
  return useQuery({
    queryKey: marketDataKeys.priceHistory(tokenId, interval, fidelity),
    queryFn: async () => {
      if (!tokenId) {
        throw new Error("tokenId is required");
      }

      const data = await getPriceHistory(tokenId, {
        interval: interval as any,
        fidelity,
      });

      return data;
    },
    enabled: enabled && !!tokenId,
    staleTime: CACHE_TIMES.PRICE_HISTORY,
    gcTime: CACHE_GARBAGE_COLLECTION_TIMES.PRICE_HISTORY,
    retry: 1,
  });
}

/**
 * Fetch order book for a token
 */
export function useOrderBook({ tokenId, enabled = true }: UseOrderBookOptions) {
  return useQuery({
    queryKey: marketDataKeys.orderBook(tokenId),
    queryFn: async (): Promise<OrderBook> => {
      if (!tokenId) {
        throw new Error("tokenId is required");
      }

      const data = await getOrderBook(tokenId);
      return data;
    },
    enabled: enabled && !!tokenId,
    staleTime: CACHE_TIMES.ORDER_BOOK,
    gcTime: CACHE_GARBAGE_COLLECTION_TIMES.ORDER_BOOK,
    retry: 1,
    refetchInterval: REFETCH_INTERVALS.ORDER_BOOK,
  });
}

/**
 * Fetch trade history for a market
 */
export function useTrades({ 
  marketId, 
  limit = 20, 
  enabled = true 
}: UseTradesOptions) {
  return useQuery({
    queryKey: marketDataKeys.trades(marketId, limit),
    queryFn: async (): Promise<Trade[]> => {
      if (!marketId) {
        throw new Error("marketId is required");
      }

      const data = await getMarketTrades(marketId, { limit });
      return data;
    },
    enabled: enabled && !!marketId,
    staleTime: CACHE_TIMES.TRADES,
    gcTime: CACHE_GARBAGE_COLLECTION_TIMES.TRADES,
    retry: 1,
    refetchInterval: REFETCH_INTERVALS.TRADES,
  });
}
