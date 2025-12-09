/**
 * Market API Service
 *
 * Fetches market data from Polymarket APIs following official documentation.
 * All requests go through internal proxy (/api/polymarket/{apiType}/{path})
 * to avoid CORS issues and add builder attribution.
 * 
 * POLYMARKET API STRUCTURE:
 * =========================
 * 
 * 1. Gamma API (https://gamma-api.polymarket.com)
 *    - Market metadata, events, tags
 *    - Best for: Market discovery, filtering, general info
 *    - Endpoints: /events, /markets, /tags, /sports
 * 
 * 2. CLOB API (https://clob.polymarket.com)
 *    - Real-time trading data, orderbooks
 *    - Best for: Trading operations, live prices
 *    - Endpoints: /book, /markets/{condition_id}, /trades
 * 
 * THREE FETCHING STRATEGIES (per official docs):
 * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 * 
 * Strategy 1: By Slug (Best for individual markets)
 *   - Use when you have a market URL/slug
 *   - Functions: getEventBySlug(), getMarketBySlug()
 *   - Example: slug "fed-decision-in-october" from URL
 * 
 * Strategy 2: By Tags (Best for category filtering)
 *   - Use for sports, politics, crypto categories
 *   - Functions: getTags(), getMarketsByTag()
 *   - Example: tag_id=100381 for specific sport
 * 
 * Strategy 3: Via Events (Best for all active markets)
 *   - Most efficient for market discovery
 *   - Functions: getEvents(), getMarkets()
 *   - Example: order=id&ascending=false&closed=false
 * 
 * BEST PRACTICES:
 * - Use getEvents() instead of getMarkets() (events contain markets)
 * - Always include closed=false unless need historical
 * - Implement pagination with limit/offset
 * - Use slug methods for known markets (faster)
 * - Use CLOB API only for real-time trading data
 */

import { POLYMARKET_API } from "./config";
import type { Market, Event, OrderBook, Trade, PaginatedResponse } from "./types";

/**
 * Get API URL for internal proxy
 * - Server-side: absolute URL needed
 * - Client-side: relative URL works
 */
const getApiUrl = (api: "clob" | "gamma" | "data") => {
  // Server-side: need absolute URL
  if (typeof window === "undefined") {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/polymarket/${api}`;
  }
  // Client-side: relative URL works fine
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
 * Get all active markets from Polymarket Gamma API
 * 
 * Uses /markets endpoint directly for accurate market data.
 * Note: For better performance when fetching many markets, consider using getEvents()
 * which returns events containing markets.
 * 
 * @see https://docs.polymarket.com/api-reference/markets/list-markets
 */
export async function getMarkets(params?: {
  limit?: number;          // Number of markets to return (0-10000)
  offset?: number;         // Pagination offset
  closed?: boolean;        // Include closed markets (default: false)
  order?: string;          // Order by field (e.g., 'volumeNum' for volume)
  ascending?: boolean;     // Sort ascending (default: false = descending)
  tag_id?: string;         // Filter by tag ID (optional)
}): Promise<PaginatedResponse<Market>> {
  // Use Gamma API /markets endpoint directly
  const url = buildUrl(getApiUrl("gamma"), "/markets", {
    limit: params?.limit || 100,
    offset: params?.offset || 0,
    closed: params?.closed ?? false,  // Default: exclude closed markets
    order: params?.order || "volumeNum",  // Order by volume
    ascending: params?.ascending ?? false,  // Descending order
    tag_id: params?.tag_id,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch markets: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Gamma API /markets returns array of markets directly
  return {
    data: Array.isArray(data) ? data : data.data || [],
    next_cursor: data.next_cursor,
  };
}

/**
 * Get markets from events (more efficient for bulk fetching)
 * 
 * This is the RECOMMENDED approach per Polymarket docs when you need
 * to fetch many markets at once. Events contain their associated markets.
 * 
 * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 */
export async function getMarketsFromEvents(params?: {
  limit?: number;          // Number of events to return
  offset?: number;         // Pagination offset
  closed?: boolean;        // Include closed events (default: false)
  order?: string;          // Order by field (e.g., 'id' for newest first)
  ascending?: boolean;     // Sort ascending (default: false = descending)
  tag_id?: string;         // Filter by tag ID
}): Promise<PaginatedResponse<Market>> {
  // Use Gamma API /events endpoint (more efficient than /markets per documentation)
  const url = buildUrl(getApiUrl("gamma"), "/events", {
    limit: params?.limit || 100,
    offset: params?.offset || 0,
    closed: params?.closed ?? false,
    order: params?.order || "id",
    ascending: params?.ascending ?? false,
    tag_id: params?.tag_id,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }
  
  const events = await response.json();
  const eventsList = Array.isArray(events) ? events : [];
  
  // Extract all markets from events
  const allMarkets: Market[] = [];
  eventsList.forEach((event: any) => {
    if (event.markets && Array.isArray(event.markets)) {
      event.markets.forEach((market: any) => {
        // Preserve all market fields and add event context
        allMarkets.push({
          ...market,
          eventTitle: event.title,
          eventSlug: event.slug,
        });
      });
    }
  });
  
  return {
    data: allMarkets,
    next_cursor: undefined,
  };
}

/**
 * Get a single market by condition ID
 * Uses CLOB API which provides real-time trading data
 * 
 * @param conditionId - The condition_id of the market
 */
export async function getMarket(conditionId: string): Promise<Market | null> {
  const url = `${getApiUrl("clob")}/markets/${conditionId}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch market: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get market by slug (from URL path)
 * Uses Gamma API for market metadata
 * 
 * @param slug - The market slug (e.g., "fed-decision-in-october")
 * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 */
export async function getMarketBySlug(slug: string): Promise<Market | null> {
  const url = `${getApiUrl("gamma")}/markets/slug/${slug}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch market by slug: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get sampling/featured markets - returns top active markets
 * Uses /markets endpoint directly with volume ordering
 */
export async function getSamplingMarkets(): Promise<Market[]> {
  const url = buildUrl(getApiUrl("gamma"), "/markets", {
    limit: 20,
    closed: false,
    order: "volumeNum",  // Order by volume for featured/popular markets
    ascending: false,
  });
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sampling markets: ${response.statusText}`);
  }
  
  const data = await response.json();
  return Array.isArray(data) ? data : data.data || [];
}

// ============= Event Endpoints (Gamma API) =============

/**
 * Get all events with their markets
 * Most efficient way to retrieve all active markets per documentation
 * 
 * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 */
export async function getEvents(params?: {
  limit?: number;           // Number of events to return (pagination)
  offset?: number;          // Pagination offset
  closed?: boolean;         // Include closed events (default: false for active only)
  order?: string;           // Order by field (e.g., 'id' for newest first)
  ascending?: boolean;      // Sort direction (default: false = descending)
  tag_id?: string;          // Filter by tag ID
  related_tags?: boolean;   // Include related tags
  exclude_tag_id?: string;  // Exclude specific tag
}): Promise<Event[]> {
  const url = buildUrl(getApiUrl("gamma"), "/events", {
    limit: params?.limit,
    offset: params?.offset,
    closed: params?.closed,
    order: params?.order,
    ascending: params?.ascending,
    tag_id: params?.tag_id,
    related_tags: params?.related_tags,
    exclude_tag_id: params?.exclude_tag_id,
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
  const url = `${getApiUrl("gamma")}/events/${eventId}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch event: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get event by slug (from URL path)
 * Best for fetching specific individual events
 * 
 * @param slug - The event slug (e.g., "fed-decision-in-october")
 * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  const url = `${getApiUrl("gamma")}/events/slug/${slug}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch event by slug: ${response.statusText}`);
  }
  
  return response.json();
}

// ============= Tags Endpoints =============

/**
 * Get all available tags for filtering markets
 * @see https://docs.polymarket.com/api-reference/tags/list-tags
 */
export async function getTags(): Promise<any[]> {
  const url = `${getApiUrl("gamma")}/tags`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tags: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get sports tags and metadata
 * @see https://docs.polymarket.com/api-reference/sports/get-sports-metadata-information
 */
export async function getSportsTags(): Promise<any> {
  const url = `${getApiUrl("gamma")}/sports`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sports tags: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get markets filtered by tag
 * Ideal for filtering markets by category or sport
 * 
 * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 */
export async function getMarketsByTag(params: {
  tag_id: string;           // Required: Tag ID to filter by
  limit?: number;           // Number of markets to return
  offset?: number;          // Pagination offset
  closed?: boolean;         // Include closed markets
  related_tags?: boolean;   // Include related tag markets
  exclude_tag_id?: string;  // Exclude specific tag
}): Promise<PaginatedResponse<Market>> {
  const url = buildUrl(getApiUrl("gamma"), "/markets", {
    tag_id: params.tag_id,
    limit: params.limit,
    offset: params.offset,
    closed: params.closed,
    related_tags: params.related_tags,
    exclude_tag_id: params.exclude_tag_id,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch markets by tag: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    data: Array.isArray(data) ? data : data.data || [],
    next_cursor: data.next_cursor,
  };
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
/**
 * Get price history for a token
 * 
 * @param tokenId - The CLOB token ID (NOT condition_id)
 * @param params.interval - Duration: "1m" | "1h" | "6h" | "1d" | "1w" | "max" (mutually exclusive with startTs/endTs)
 * @param params.fidelity - Resolution in minutes (default: 60)
 * @param params.startTs - Start Unix timestamp (mutually exclusive with interval)
 * @param params.endTs - End Unix timestamp (mutually exclusive with interval)
 */
export async function getPriceHistory(
  tokenId: string,
  params?: {
    interval?: "1m" | "1h" | "6h" | "1d" | "1w" | "max";
    fidelity?: number;
    startTs?: number;
    endTs?: number;
  }
): Promise<{ history: Array<{ t: number; p: number }> }> {
  // Build query params - interval OR startTs/endTs (mutually exclusive)
  const queryParams: Record<string, string | number | undefined> = {
    market: tokenId,
    fidelity: params?.fidelity || 60,
  };

  // Use interval OR startTs/endTs (mutually exclusive per docs)
  if (params?.startTs && params?.endTs) {
    queryParams.startTs = params.startTs;
    queryParams.endTs = params.endTs;
  } else {
    queryParams.interval = params?.interval || "1d";
  }

  const url = buildUrl(getApiUrl("clob"), "/prices-history", queryParams);

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
 * Handles different data structures from CLOB and Gamma APIs
 */
export function parseOutcomePrices(market: Market): { yes: number; no: number } {
  // Try parsing outcomePrices string (CLOB API format)
  if (market.outcomePrices) {
    try {
      const prices = JSON.parse(market.outcomePrices);
      if (Array.isArray(prices) && prices.length >= 2) {
        return {
          yes: parseFloat(prices[0] || "0.5"),
          no: parseFloat(prices[1] || "0.5"),
        };
      }
    } catch {
      // Continue to next method
    }
  }
  
  // Use token prices if tokens array exists
  if (market.tokens && Array.isArray(market.tokens) && market.tokens.length > 0) {
    const yesToken = market.tokens.find((t) => 
      t.outcome?.toLowerCase() === "yes" || 
      t.outcome === "Yes"
    );
    const noToken = market.tokens.find((t) => 
      t.outcome?.toLowerCase() === "no" || 
      t.outcome === "No"
    );
    
    if (yesToken || noToken) {
      return {
        yes: yesToken?.price ?? 0.5,
        no: noToken?.price ?? 0.5,
      };
    }
  }
  
  // Fallback to default 50/50
  return {
    yes: 0.5,
    no: 0.5,
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
