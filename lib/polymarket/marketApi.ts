/**
 * Market API Service
 *
 * Fetches market data from Polymarket APIs (CLOB & Gamma)
 * Uses internal proxy to avoid CORS issues
 */

import { POLYMARKET_API } from "./config";
import type { Market, Event, OrderBook, Trade, PaginatedResponse } from "./types";

// Use internal proxy in development, direct API in production
const getApiUrl = (api: "clob" | "gamma" | "data") => {
  if (typeof window === "undefined") {
    // Server-side: use direct API
    const urls = {
      clob: POLYMARKET_API.CLOB,
      gamma: POLYMARKET_API.GAMMA,
      data: POLYMARKET_API.DATA,
    };
    return urls[api];
  }
  // Client-side: use proxy
  return `/api/polymarket/${api}`;
};

// Helper to build URL with query params
const buildUrl = (base: string, path: string, params?: Record<string, string | number | boolean | undefined>) => {
  let url = `${base}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  return url;
};

// ============= Market Endpoints =============

/**
 * Get all active markets
 */
export async function getMarkets(params?: {
  limit?: number;
  cursor?: string;
  closed?: boolean;
}): Promise<PaginatedResponse<Market>> {
  const url = buildUrl(getApiUrl("clob"), "/markets", {
    limit: params?.limit,
    next_cursor: params?.cursor,
    closed: params?.closed,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch markets: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    data: Array.isArray(data) ? data : data.data || [],
    next_cursor: data.next_cursor,
  };
}

/**
 * Get a single market by condition ID
 */
export async function getMarket(conditionId: string): Promise<Market | null> {
  const response = await fetch(`${getApiUrl("clob")}/markets/${conditionId}`);
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch market: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get sampling/featured markets
 */
export async function getSamplingMarkets(): Promise<Market[]> {
  const response = await fetch(`${getApiUrl("clob")}/sampling-markets`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sampling markets: ${response.statusText}`);
  }
  
  const data = await response.json();
  // Handle different response formats
  if (Array.isArray(data)) {
    return data;
  }
  if (data.data && Array.isArray(data.data)) {
    return data.data;
  }
  if (data.markets && Array.isArray(data.markets)) {
    return data.markets;
  }
  // If single market, wrap in array
  if (data.condition_id) {
    return [data];
  }
  console.warn('Unexpected sampling markets response:', data);
  return [];
}

// ============= Event Endpoints (Gamma API) =============

/**
 * Get all events with their markets
 */
export async function getEvents(params?: {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  tag?: string;
}): Promise<Event[]> {
  const url = buildUrl(getApiUrl("gamma"), "/events", {
    limit: params?.limit,
    offset: params?.offset,
    active: params?.active,
    closed: params?.closed,
    tag: params?.tag,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get a single event by ID
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  const response = await fetch(`${getApiUrl("gamma")}/events/${eventId}`);
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch event: ${response.statusText}`);
  }
  
  return response.json();
}

// ============= Order Book Endpoints =============

/**
 * Get order book for a token
 */
export async function getOrderBook(tokenId: string): Promise<OrderBook> {
  const response = await fetch(`${getApiUrl("clob")}/book?token_id=${tokenId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch order book: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get order books for multiple tokens
 */
export async function getOrderBooks(tokenIds: string[]): Promise<OrderBook[]> {
  const promises = tokenIds.map((id) => getOrderBook(id));
  return Promise.all(promises);
}

/**
 * Get last trade price for a token
 */
export async function getLastTradePrice(tokenId: string): Promise<{ price: string }> {
  const response = await fetch(`${getApiUrl("clob")}/last-trade-price?token_id=${tokenId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch last trade price: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get price history for a market
 */
export async function getPriceHistory(
  conditionId: string,
  params?: {
    interval?: "1m" | "5m" | "1h" | "1d";
    fidelity?: number;
  }
): Promise<{ history: Array<{ t: number; p: number }> }> {
  const url = buildUrl(getApiUrl("clob"), "/prices-history", {
    market: conditionId,
    interval: params?.interval,
    fidelity: params?.fidelity,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch price history: ${response.statusText}`);
  }
  
  return response.json();
}

// ============= Trade History =============

/**
 * Get recent trades for a market (public)
 */
export async function getMarketTrades(
  conditionId: string,
  params?: { limit?: number }
): Promise<Trade[]> {
  const url = buildUrl(getApiUrl("data"), "/trades", {
    market: conditionId,
    limit: params?.limit,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch trades: ${response.statusText}`);
  }
  
  return response.json();
}

// ============= Helper Functions =============

/**
 * Calculate market prices from order book
 */
export function calculateMarketPrice(orderBook: OrderBook): {
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
} {
  const bestBid = orderBook.bids.length > 0 
    ? parseFloat(orderBook.bids[0].price) 
    : 0;
  const bestAsk = orderBook.asks.length > 0 
    ? parseFloat(orderBook.asks[0].price) 
    : 1;
  
  const midPrice = (bestBid + bestAsk) / 2;
  const spread = bestAsk - bestBid;
  
  return { bestBid, bestAsk, midPrice, spread };
}

/**
 * Parse outcome prices from market data
 */
export function parseOutcomePrices(market: Market): { yes: number; no: number } {
  if (market.outcomePrices) {
    try {
      const prices = JSON.parse(market.outcomePrices);
      return {
        yes: parseFloat(prices[0] || "0.5"),
        no: parseFloat(prices[1] || "0.5"),
      };
    } catch {
      // Fallback to token prices
    }
  }
  
  // Use token prices if available
  const yesToken = market.tokens.find((t) => t.outcome === "Yes");
  const noToken = market.tokens.find((t) => t.outcome === "No");
  
  return {
    yes: yesToken?.price ?? 0.5,
    no: noToken?.price ?? 0.5,
  };
}

/**
 * Format USDC amount (6 decimals)
 */
export function formatUsdc(amount: string | number): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
