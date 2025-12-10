/**
 * React Query hooks for Portfolio/Positions data
 * 
 * Provides cached data for user positions, orders, and trade history
 */

import { useQuery } from "@tanstack/react-query";
import type { Order, Trade, Position } from "@/lib/polymarket/types";

// ============= Query Keys =============

export const portfolioKeys = {
  all: ["portfolio"] as const,
  positions: (address?: string) => [...portfolioKeys.all, "positions", address] as const,
  orders: (address?: string) => [...portfolioKeys.all, "orders", address] as const,
  trades: (address?: string) => [...portfolioKeys.all, "trades", address] as const,
  balance: (address?: string) => [...portfolioKeys.all, "balance", address] as const,
};

// ============= Types =============

interface UsePositionsOptions {
  safeAddress?: string;
  clobClient?: any;
  enabled?: boolean;
}

interface UseOrdersOptions {
  safeAddress?: string;
  clobClient?: any;
  enabled?: boolean;
}

interface UseTradesOptions {
  safeAddress?: string;
  enabled?: boolean;
}

// ============= Hooks =============

/**
 * Fetch user positions from Polymarket Data API
 */
export function usePositions({ safeAddress, enabled = true }: UsePositionsOptions) {
  return useQuery({
    queryKey: portfolioKeys.positions(safeAddress),
    queryFn: async () => {
      if (!safeAddress) {
        return [];
      }

      const positionsUrl = `https://data-api.polymarket.com/positions?user=${safeAddress}&sizeThreshold=1&limit=100`;
      const response = await fetch(positionsUrl);
      
      if (!response.ok) {
        console.error("[usePositions] Failed to fetch:", response.statusText);
        return [];
      }

      const data = await response.json();
      
      // Transform to Position type
      const positions: Position[] = (data as any[]).map((pos) => ({
        asset: pos.asset || "",
        condition_id: pos.conditionId || "",
        market: pos.title || "",
        outcome: pos.outcome || "",
        price: pos.curPrice || 0,
        size: pos.size || 0,
        value: pos.currentValue || 0,
        avgPrice: pos.avgPrice || 0,
        realizedPnl: pos.realizedPnl || 0,
        unrealizedPnl: pos.cashPnl || 0,
      }));

      return positions;
    },
    enabled: enabled && !!safeAddress,
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

/**
 * Fetch user open orders from CLOB client
 */
export function useOrders({ safeAddress, clobClient, enabled = true }: UseOrdersOptions) {
  return useQuery({
    queryKey: portfolioKeys.orders(safeAddress),
    queryFn: async () => {
      if (!clobClient || !safeAddress) {
        return [];
      }

      try {
        const ordersData = await clobClient.getOpenOrders();
        
        // Transform to Order type
        const orders: Order[] = (ordersData as any[]).map((order) => ({
          id: order.id || order.order_id || String(Math.random()),
          owner: order.owner || "",
          market: order.market || order.asset_id || "",
          asset_id: order.asset_id || order.tokenID || "",
          side: (order.side?.toUpperCase() || "BUY") as "BUY" | "SELL",
          original_size: String(order.original_size || order.size || "0"),
          size_matched: String(order.size_matched || "0"),
          price: String(order.price || "0"),
          type: (order.type || "GTC") as "GTC" | "GTD" | "FOK" | "IOC",
          timestamp: order.timestamp || order.created_at || new Date().toISOString(),
          outcome: order.outcome,
          status: order.status,
        }));

        return orders;
      } catch (error) {
        console.error("[useOrders] Failed to fetch:", error);
        return [];
      }
    },
    enabled: enabled && !!clobClient && !!safeAddress,
    staleTime: 10 * 1000, // 10 seconds - orders change frequently
    gcTime: 2 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Fetch user trade history from Polymarket Data API
 */
export function useTrades({ safeAddress, enabled = true }: UseTradesOptions) {
  return useQuery({
    queryKey: portfolioKeys.trades(safeAddress),
    queryFn: async () => {
      if (!safeAddress) {
        return [];
      }

      const queryParams = new URLSearchParams();
      queryParams.append("limit", "100");
      queryParams.append("user", safeAddress);
      
      const tradesUrl = `https://data-api.polymarket.com/trades?${queryParams.toString()}`;
      const response = await fetch(tradesUrl);

      if (!response.ok) {
        console.error("[useTrades] Failed to fetch:", response.statusText);
        return [];
      }

      const data = await response.json();
      
      // Transform to Trade type
      const trades: Trade[] = (data as any[]).map((trade) => ({
        id: trade.id || trade.trade_id || String(Math.random()),
        taker_order_id: trade.taker_order_id || trade.id || "",
        market: trade.market || "",
        asset_id: trade.asset_id || "",
        side: (trade.side?.toUpperCase() || "BUY") as "BUY" | "SELL",
        size: String(trade.size || "0"),
        fee_rate_bps: String(trade.fee_rate_bps || "0"),
        price: String(trade.price || "0"),
        status: trade.status || "completed",
        match_time: trade.match_time || trade.timestamp || new Date().toISOString(),
        last_update: trade.last_update || trade.timestamp || new Date().toISOString(),
        outcome: trade.outcome,
        maker_address: trade.maker_address,
        trader_side: trade.trader_side,
        transaction_hash: trade.transaction_hash,
      }));

      return trades;
    },
    enabled: enabled && !!safeAddress,
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Fetch user balance from CLOB client
 */
export function useBalance({ safeAddress, clobClient, enabled = true }: UseOrdersOptions) {
  return useQuery({
    queryKey: portfolioKeys.balance(safeAddress),
    queryFn: async () => {
      if (!clobClient || !safeAddress) {
        return 0;
      }

      try {
        const balanceData = await clobClient.getBalanceAllowance({
          asset_type: "COLLATERAL" as any,
        });

        if (!balanceData) {
          return 0;
        }

        // Balance is in wei (6 decimals for USDC.e)
        const balanceInWei = parseFloat(balanceData.balance) || 0;
        const balanceInUsdc = balanceInWei / 1_000_000;
        
        return balanceInUsdc;
      } catch (error) {
        console.error("[useBalance] Failed to fetch:", error);
        return 0;
      }
    },
    enabled: enabled && !!clobClient && !!safeAddress,
    staleTime: 20 * 1000, // 20 seconds
    gcTime: 2 * 60 * 1000,
    retry: 1,
  });
}
