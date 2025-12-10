/**
 * Token Utilities for Polymarket Markets
 * 
 * Handles parsing and extraction of token information from market data
 */

import type { Market, MarketToken } from "./types";

interface MarketPrices {
  yes: number;
  no: number;
}

interface MarketTokens {
  yesToken: MarketToken | null;
  noToken: MarketToken | null;
}

/**
 * Extract Yes/No tokens from market data
 * Handles multiple data formats: tokens array or clobTokenIds parsing
 */
export function getMarketTokens(market: Market, prices: MarketPrices): MarketTokens {
  // Try to get tokens from tokens array first
  const tokensArray = market.tokens && Array.isArray(market.tokens) ? market.tokens : [];
  
  let yesToken = tokensArray.find((t) => t.outcome === "Yes") || null;
  let noToken = tokensArray.find((t) => t.outcome === "No") || null;
  
  // If tokens not found but clobTokenIds exists, construct tokens
  if (!yesToken && !noToken && market.clobTokenIds) {
    try {
      const tokenIds = parseClobTokenIds(market.clobTokenIds);
      const outcomes = parseOutcomes(market.outcomes);
      
      if (Array.isArray(outcomes) && tokenIds.length >= 2) {
        // Find Yes and No token IDs
        const yesIndex = outcomes.findIndex((o: string) => o.toLowerCase() === "yes");
        const noIndex = outcomes.findIndex((o: string) => o.toLowerCase() === "no");
        
        if (yesIndex >= 0 && tokenIds[yesIndex]) {
          yesToken = {
            token_id: cleanTokenId(tokenIds[yesIndex]),
            outcome: "Yes",
            price: prices.yes,
            winner: false,
          };
        }
        
        if (noIndex >= 0 && tokenIds[noIndex]) {
          noToken = {
            token_id: cleanTokenId(tokenIds[noIndex]),
            outcome: "No",
            price: prices.no,
            winner: false,
          };
        }
      }
    } catch {
      // Failed to parse, return nulls
    }
  }
  
  return { yesToken, noToken };
}

/**
 * Parse clobTokenIds from string or array format
 */
export function parseClobTokenIds(clobTokenIds: string | string[]): string[] {
  if (typeof clobTokenIds === 'string') {
    return JSON.parse(clobTokenIds);
  } else if (Array.isArray(clobTokenIds)) {
    return clobTokenIds;
  }
  return [];
}

/**
 * Parse outcomes from string or array format
 */
export function parseOutcomes(outcomes: string | string[] | undefined): string[] {
  if (!outcomes) return [];
  
  if (typeof outcomes === 'string') {
    return JSON.parse(outcomes);
  } else if (Array.isArray(outcomes)) {
    return outcomes;
  }
  return [];
}

/**
 * Clean token ID (remove quotes and trim)
 */
export function cleanTokenId(tokenId: string): string {
  return tokenId.replace(/^["']|["']$/g, '').trim();
}

/**
 * Get selected token based on outcome
 */
export function getSelectedToken(
  tokens: MarketTokens,
  outcome: "Yes" | "No"
): MarketToken | null {
  return outcome === "Yes" ? tokens.yesToken : tokens.noToken;
}

/**
 * Get selected price with fallback
 */
export function getSelectedPrice(
  token: MarketToken | null,
  outcome: "Yes" | "No",
  prices: MarketPrices
): number {
  return token?.price ?? (outcome === "Yes" ? prices.yes : prices.no);
}
