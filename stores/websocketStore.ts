/**
 * WebSocket Store
 * Centralized state management for real-time market data
 */

import { create } from "zustand";
import { getWebSocketClient, type WSMessage, type PriceUpdate, type BookUpdate, type TradeUpdate } from "@/lib/polymarket/websocket";

// Types

interface WebSocketState {
  // Connection
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempts: number;

  // Real-time data
  prices: Map<string, PriceUpdate>;        // assetId -> price
  orderBooks: Map<string, BookUpdate>;     // assetId -> book
  recentTrades: TradeUpdate[];             // Last 100 trades across all markets

  // Subscriptions tracking
  priceSubscriptions: Set<string>;         // assetIds
  bookSubscriptions: Set<string>;          // assetIds
  tradeSubscriptions: Set<string>;         // marketIds
}

interface WebSocketActions {
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  setConnectionStatus: (isConnected: boolean) => void;
  setConnectionError: (error: string | null) => void;

  // Data updates (called by WebSocket message handlers)
  updatePrice: (assetId: string, update: PriceUpdate) => void;
  updateOrderBook: (assetId: string, update: BookUpdate) => void;
  addTrade: (trade: TradeUpdate) => void;

  // Subscriptions
  subscribePrices: (assetIds: string[]) => void;
  unsubscribePrices: (assetIds: string[]) => void;
  subscribeOrderBook: (assetIds: string[]) => void;
  unsubscribeOrderBook: (assetIds: string[]) => void;
  subscribeTrades: (marketIds: string[]) => void;
  unsubscribeTrades: (marketIds: string[]) => void;

  // Selectors
  getPrice: (assetId: string) => PriceUpdate | null;
  getOrderBook: (assetId: string) => BookUpdate | null;
  getTrades: (marketId: string, limit?: number) => TradeUpdate[];
}

type WebSocketStore = WebSocketState & WebSocketActions;

const initialState: WebSocketState = {
  isConnected: false,
  connectionError: null,
  reconnectAttempts: 0,
  prices: new Map(),
  orderBooks: new Map(),
  recentTrades: [],
  priceSubscriptions: new Set(),
  bookSubscriptions: new Set(),
  tradeSubscriptions: new Set(),
};

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  ...initialState,

  // Connection management
  connect: async () => {
    const client = getWebSocketClient();
    
    try {
      await client.connect();
      set({ 
        isConnected: true, 
        connectionError: null,
        reconnectAttempts: 0 
      });
    } catch (error) {
      set({ 
        isConnected: false,
        connectionError: error instanceof Error ? error.message : "Connection failed",
        reconnectAttempts: get().reconnectAttempts + 1
      });
      throw error;
    }
  },

  disconnect: () => {
    const client = getWebSocketClient();
    client.disconnect();
    set({ isConnected: false });
  },

  setConnectionStatus: (isConnected) => set({ isConnected }),
  setConnectionError: (error) => set({ connectionError: error }),

  // Data updates
  updatePrice: (assetId, update) => {
    set((state) => {
      const newPrices = new Map(state.prices);
      newPrices.set(assetId, update);
      return { prices: newPrices };
    });
  },

  updateOrderBook: (assetId, update) => {
    set((state) => {
      const newBooks = new Map(state.orderBooks);
      newBooks.set(assetId, update);
      return { orderBooks: newBooks };
    });
  },

  addTrade: (trade) => {
    set((state) => ({
      recentTrades: [trade, ...state.recentTrades].slice(0, 100)
    }));
  },

  // Subscription management
  subscribePrices: (assetIds) => {
    const client = getWebSocketClient();
    const { priceSubscriptions, isConnected } = get();
    
    const newSubs = new Set(priceSubscriptions);
    const toSubscribe = assetIds.filter(id => !newSubs.has(id));
    
    if (toSubscribe.length > 0 && isConnected) {
      client.subscribePrices(toSubscribe);
      toSubscribe.forEach(id => newSubs.add(id));
      set({ priceSubscriptions: newSubs });
    }
  },

  unsubscribePrices: (assetIds) => {
    const client = getWebSocketClient();
    const { priceSubscriptions } = get();
    
    const newSubs = new Set(priceSubscriptions);
    assetIds.forEach(id => newSubs.delete(id));
    
    if (assetIds.length > 0) {
      client.unsubscribePrices(assetIds);
      set({ priceSubscriptions: newSubs });
    }
  },

  subscribeOrderBook: (assetIds) => {
    const client = getWebSocketClient();
    const { bookSubscriptions, isConnected } = get();
    
    const newSubs = new Set(bookSubscriptions);
    const toSubscribe = assetIds.filter(id => !newSubs.has(id));
    
    if (toSubscribe.length > 0 && isConnected) {
      client.subscribeOrderBook(toSubscribe);
      toSubscribe.forEach(id => newSubs.add(id));
      set({ bookSubscriptions: newSubs });
    }
  },

  unsubscribeOrderBook: (assetIds) => {
    const client = getWebSocketClient();
    const { bookSubscriptions } = get();
    
    const newSubs = new Set(bookSubscriptions);
    assetIds.forEach(id => newSubs.delete(id));
    
    if (assetIds.length > 0) {
      client.unsubscribeOrderBook(assetIds);
      set({ bookSubscriptions: newSubs });
    }
  },

  subscribeTrades: (marketIds) => {
    const client = getWebSocketClient();
    const { tradeSubscriptions, isConnected } = get();
    
    const newSubs = new Set(tradeSubscriptions);
    const toSubscribe = marketIds.filter(id => !newSubs.has(id));
    
    if (toSubscribe.length > 0 && isConnected) {
      client.subscribeTrades(toSubscribe);
      toSubscribe.forEach(id => newSubs.add(id));
      set({ tradeSubscriptions: newSubs });
    }
  },

  unsubscribeTrades: (marketIds) => {
    const client = getWebSocketClient();
    const { tradeSubscriptions } = get();
    
    const newSubs = new Set(tradeSubscriptions);
    marketIds.forEach(id => newSubs.delete(id));
    
    if (marketIds.length > 0) {
      client.unsubscribeTrades(marketIds);
      set({ tradeSubscriptions: newSubs });
    }
  },

  // Selectors
  getPrice: (assetId) => {
    return get().prices.get(assetId) || null;
  },

  getOrderBook: (assetId) => {
    return get().orderBooks.get(assetId) || null;
  },

  getTrades: (marketId, limit = 20) => {
    const { recentTrades } = get();
    return recentTrades
      .filter(trade => trade.market === marketId)
      .slice(0, limit);
  },
}));

// Selector Hooks

/**
 * Hook to get live price for an asset
 */
export function useLivePrice(assetId: string | undefined) {
  const price = useWebSocketStore((state) => 
    assetId ? state.prices.get(assetId) : null
  );
  const subscribePrices = useWebSocketStore((state) => state.subscribePrices);
  const unsubscribePrices = useWebSocketStore((state) => state.unsubscribePrices);

  React.useEffect(() => {
    if (!assetId) return;

    subscribePrices([assetId]);
    return () => unsubscribePrices([assetId]);
  }, [assetId, subscribePrices, unsubscribePrices]);

  return price;
}

/**
 * Hook to get live order book for an asset
 */
export function useLiveOrderBook(assetId: string | undefined) {
  const book = useWebSocketStore((state) => 
    assetId ? state.orderBooks.get(assetId) : null
  );
  const subscribeOrderBook = useWebSocketStore((state) => state.subscribeOrderBook);
  const unsubscribeOrderBook = useWebSocketStore((state) => state.unsubscribeOrderBook);

  React.useEffect(() => {
    if (!assetId) return;

    subscribeOrderBook([assetId]);
    return () => unsubscribeOrderBook([assetId]);
  }, [assetId, subscribeOrderBook, unsubscribeOrderBook]);

  return book;
}

/**
 * Hook to get live trades for a market
 */
export function useLiveTrades(marketId: string | undefined, limit = 20) {
  const getTrades = useWebSocketStore((state) => state.getTrades);
  const subscribeTrades = useWebSocketStore((state) => state.subscribeTrades);
  const unsubscribeTrades = useWebSocketStore((state) => state.unsubscribeTrades);

  const trades = marketId ? getTrades(marketId, limit) : [];

  React.useEffect(() => {
    if (!marketId) return;

    subscribeTrades([marketId]);
    return () => unsubscribeTrades([marketId]);
  }, [marketId, subscribeTrades, unsubscribeTrades]);

  return trades;
}

// Re-export for backward compatibility
import React from "react";
export type { PriceUpdate, BookUpdate, TradeUpdate } from "@/lib/polymarket/websocket";
