/**
 * Trading API Service
 *
 * Handles authenticated trading operations with Polymarket CLOB API.
 * Uses the internal signing server for Builder attribution.
 */

import { POLYMARKET_API } from "./config";
import type {
  Order,
  OrderParams,
  OrderResult,
  Trade,
  Position,
  TradeEstimate,
  OrderBook,
} from "./types";

// ============= Types =============

export interface TradingCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export interface SignedHeaders {
  "POLY-ADDRESS": string;
  "POLY-SIGNATURE": string;
  "POLY-TIMESTAMP": string;
  "POLY-API-KEY": string;
  "POLY-PASSPHRASE": string;
}

// ============= Internal Signing =============

/**
 * Get signed headers from internal signing server
 */
async function getSignedHeaders(
  method: string,
  path: string,
  body?: string
): Promise<{ signature: string; timestamp: number; key: string; passphrase: string }> {
  const response = await fetch("/api/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, path, body }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to sign request");
  }

  return response.json();
}

/**
 * Make authenticated request to CLOB API
 */
async function authenticatedFetch<T>(
  method: string,
  path: string,
  walletAddress: string,
  body?: Record<string, unknown>
): Promise<T> {
  const bodyStr = body ? JSON.stringify(body) : undefined;
  const signed = await getSignedHeaders(method, path, bodyStr);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "POLY-ADDRESS": walletAddress,
    "POLY-SIGNATURE": signed.signature,
    "POLY-TIMESTAMP": signed.timestamp.toString(),
    "POLY-API-KEY": signed.key,
    "POLY-PASSPHRASE": signed.passphrase,
  };

  const response = await fetch(`${POLYMARKET_API.CLOB}${path}`, {
    method,
    headers,
    body: bodyStr,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

// ============= API Key Management =============

// CLOB Auth domain for EIP-712 signing
const CLOB_AUTH_DOMAIN = {
  name: "ClobAuthDomain",
  version: "1",
  chainId: 137, // Polygon
};

const CLOB_AUTH_TYPES = {
  ClobAuth: [
    { name: "address", type: "address" },
    { name: "timestamp", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "message", type: "string" },
  ],
};

const MSG_TO_SIGN = "This message attests that I control the given wallet";

/**
 * Derive API key from wallet signature
 * Uses EIP-712 typed data signing for Level 1 auth
 * Calls internal proxy to avoid CORS issues
 */
export async function deriveApiKey(
  walletAddress: string,
  signTypedData: (domain: object, types: object, value: object) => Promise<string>
): Promise<TradingCredentials> {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = 0;

  // Sign EIP-712 message
  const signature = await signTypedData(
    CLOB_AUTH_DOMAIN,
    CLOB_AUTH_TYPES,
    {
      address: walletAddress,
      timestamp: timestamp.toString(),
      nonce: BigInt(nonce),
      message: MSG_TO_SIGN,
    }
  );

  // Call internal proxy to avoid CORS
  const response = await fetch("/api/auth/derive-api-key", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address: walletAddress,
      signature,
      timestamp,
      nonce,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || "Failed to derive API key");
  }

  const data = await response.json();
  return {
    apiKey: data.apiKey,
    secret: data.secret,
    passphrase: data.passphrase,
  };
}

// ============= Order Management =============

/**
 * Create and post an order
 */
export async function createOrder(
  walletAddress: string,
  params: OrderParams
): Promise<OrderResult> {
  try {
    const orderBody = {
      token_id: params.tokenId,
      side: params.side,
      price: params.price.toString(),
      size: params.size.toString(),
      type: params.orderType || "GTC",
      expiration: params.expiration,
    };

    const result = await authenticatedFetch<{ orderID: string; status: string }>(
      "POST",
      "/order",
      walletAddress,
      orderBody
    );

    return {
      success: true,
      orderId: result.orderID,
      status: result.status,
      orderDetails: {
        side: params.side,
        price: params.price,
        size: params.size,
        tokenId: params.tokenId,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create order",
    };
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(
  walletAddress: string,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authenticatedFetch("DELETE", `/order/${orderId}`, walletAddress);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel order",
    };
  }
}

/**
 * Cancel all orders for a market
 */
export async function cancelAllOrders(
  walletAddress: string,
  market?: string
): Promise<{ success: boolean; cancelled: number; error?: string }> {
  try {
    const path = market ? `/orders?market=${market}` : "/orders";
    const result = await authenticatedFetch<{ cancelled: number }>(
      "DELETE",
      path,
      walletAddress
    );
    return { success: true, cancelled: result.cancelled };
  } catch (error) {
    return {
      success: false,
      cancelled: 0,
      error: error instanceof Error ? error.message : "Failed to cancel orders",
    };
  }
}

// ============= Order & Trade Queries =============

/**
 * Get open orders for user
 */
export async function getOpenOrders(
  walletAddress: string,
  market?: string
): Promise<Order[]> {
  const path = market ? `/orders?market=${market}` : "/orders";
  return authenticatedFetch("GET", path, walletAddress);
}

/**
 * Get trade history for user
 */
export async function getTradeHistory(
  walletAddress: string,
  params?: { limit?: number; market?: string }
): Promise<Trade[]> {
  let path = "/trades";
  const searchParams = new URLSearchParams();
  
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.market) searchParams.set("market", params.market);
  
  if (searchParams.toString()) {
    path += `?${searchParams.toString()}`;
  }

  return authenticatedFetch("GET", path, walletAddress);
}

// ============= Balance & Positions =============

/**
 * Get USDC balance
 */
export async function getBalance(walletAddress: string): Promise<{ balance: string }> {
  return authenticatedFetch("GET", "/balance", walletAddress);
}

/**
 * Get all positions for user
 */
export async function getPositions(walletAddress: string): Promise<Position[]> {
  return authenticatedFetch("GET", "/positions", walletAddress);
}

// ============= Trade Estimation =============

/**
 * Estimate trade cost and shares
 */
export function estimateTrade(
  orderBook: OrderBook,
  side: "BUY" | "SELL",
  amount: number, // USDC amount for BUY, shares for SELL
  price?: number // Limit price, if not provided will calculate market order
): TradeEstimate {
  const levels = side === "BUY" ? orderBook.asks : orderBook.bids;
  
  let remaining = amount;
  let totalCost = 0;
  let totalShares = 0;

  for (const level of levels) {
    const levelPrice = parseFloat(level.price);
    const levelSize = parseFloat(level.size);
    
    // Skip if price is worse than limit
    if (price !== undefined) {
      if (side === "BUY" && levelPrice > price) break;
      if (side === "SELL" && levelPrice < price) break;
    }

    if (side === "BUY") {
      // Buying: amount is in USDC
      const maxSharesAtLevel = remaining / levelPrice;
      const sharesToBuy = Math.min(maxSharesAtLevel, levelSize);
      const cost = sharesToBuy * levelPrice;
      
      totalCost += cost;
      totalShares += sharesToBuy;
      remaining -= cost;
    } else {
      // Selling: amount is in shares
      const sharesToSell = Math.min(remaining, levelSize);
      const proceeds = sharesToSell * levelPrice;
      
      totalCost += proceeds;
      totalShares += sharesToSell;
      remaining -= sharesToSell;
    }

    if (remaining <= 0.001) break;
  }

  const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
  const midPrice = levels.length > 0 ? parseFloat(levels[0].price) : 0.5;
  const slippage = midPrice > 0 ? Math.abs(avgPrice - midPrice) / midPrice : 0;

  // For buys: potential return if price goes to 1
  // For sells: this is already the return
  const potentialReturn = side === "BUY" ? totalShares : totalCost;
  const potentialProfit = side === "BUY" ? totalShares - totalCost : 0;

  return {
    cost: side === "BUY" ? totalCost : totalShares,
    shares: side === "BUY" ? totalShares : totalCost,
    avgPrice,
    slippage,
    potentialReturn,
    potentialProfit,
  };
}

/**
 * Estimate buy order (amount in USDC)
 */
export function estimateBuy(
  orderBook: OrderBook,
  usdcAmount: number,
  maxPrice?: number
): TradeEstimate {
  return estimateTrade(orderBook, "BUY", usdcAmount, maxPrice);
}

/**
 * Estimate sell order (amount in shares)
 */
export function estimateSell(
  orderBook: OrderBook,
  shares: number,
  minPrice?: number
): TradeEstimate {
  return estimateTrade(orderBook, "SELL", shares, minPrice);
}
