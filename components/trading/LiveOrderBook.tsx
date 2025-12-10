/**
 * Live Order Book Component
 * 
 * Real-time order book display with WebSocket updates.
 * Shows bid/ask depth with visual indicators.
 */

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useOrderBook } from "@/hooks/useMarketData";
import { useLiveOrderBook } from "@/stores/websocketStore";
import { Loader2, BookOpen, TrendingUp, TrendingDown, Zap } from "lucide-react";
import type { OrderBook as OrderBookType, OrderBookLevel } from "@/lib/polymarket/types";

// ============= Types =============

interface LiveOrderBookProps {
  tokenId: string;
  maxLevels?: number;
  showSpread?: boolean;
}

interface ProcessedLevel {
  price: number;
  size: number;
  total: number;
  percentage: number;
}

// ============= Component =============

export function LiveOrderBook({
  tokenId,
  maxLevels = 10,
  showSpread = true,
}: LiveOrderBookProps) {
  // Use React Query to fetch order book
  const { data: staticBook, isLoading, error: queryError, refetch } = useOrderBook({ tokenId });
  const error = queryError ? "Failed to load order book" : null;

  // Live order book from WebSocket (store)
  const liveBookUpdate = useLiveOrderBook(tokenId);
  
  // Convert BookUpdate to OrderBookType format
  const liveBook = useMemo(() => {
    if (!liveBookUpdate) return null;
    return {
      bids: liveBookUpdate.bids,
      asks: liveBookUpdate.asks,
      market: liveBookUpdate.market,
      asset_id: liveBookUpdate.asset_id,
      timestamp: liveBookUpdate.timestamp.toString(),
    } as OrderBookType;
  }, [liveBookUpdate]);

  // Use live book if available, otherwise static
  const currentBook = liveBook || staticBook;

  // Process order book data
  const { bids, asks, spread, midPrice } = useMemo(() => {
    if (!currentBook) {
      return { bids: [], asks: [], spread: 0, midPrice: 0 };
    }

    const processLevels = (levels: OrderBookLevel[], isBid: boolean): ProcessedLevel[] => {
      if (!levels || levels.length === 0) {
        return [];
      }

      const sorted = [...levels]
        .map(l => ({ price: parseFloat(l.price), size: parseFloat(l.size) }))
        .sort((a, b) => isBid ? b.price - a.price : a.price - b.price)
        .slice(0, maxLevels);

      let cumulative = 0;
      const totalSize = sorted.reduce((sum, l) => sum + l.size, 0);

      return sorted.map(level => {
        cumulative += level.size;
        return {
          ...level,
          total: cumulative,
          percentage: totalSize > 0 ? (level.size / totalSize) * 100 : 0,
        };
      });
    };

    const processedBids = processLevels(currentBook.bids || [], true);
    const processedAsks = processLevels(currentBook.asks || [], false);

    const bestBid = processedBids[0]?.price || 0;
    const bestAsk = processedAsks[0]?.price || 0;
    const calculatedSpread = bestAsk - bestBid;
    const calculatedMid = (bestBid + bestAsk) / 2;

    // Detailed logging for debugging
    console.log("[LiveOrderBook] Processed data:", {
      rawBidsCount: (currentBook.bids || []).length,
      rawAsksCount: (currentBook.asks || []).length,
      processedBidsCount: processedBids.length,
      processedAsksCount: processedAsks.length,
      bestBid,
      bestAsk,
      spread: calculatedSpread,
      midPrice: calculatedMid,
    });

    return {
      bids: processedBids,
      asks: processedAsks,
      spread: calculatedSpread,
      midPrice: calculatedMid,
    };
  }, [currentBook, maxLevels]);

  // Format price
  const formatPrice = (price: number) => `${(price * 100).toFixed(1)}¢`;
  const formatSize = (size: number) => size >= 1000 
    ? `${(size / 1000).toFixed(1)}k` 
    : size.toFixed(0);

  return (
    <div className="bg-[#16161a] rounded-xl border border-[#27272a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#8b5cf6]" />
          <span className="font-medium">Order Book</span>
        </div>
        
        {liveBook && (
          <div className="flex items-center gap-1 text-xs text-[#22c55e]">
            <Zap className="w-3 h-3" />
            <span>Live</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-[#8b5cf6] animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="text-center py-8">
          <p className="text-[#ef4444] text-sm mb-2">{error}</p>
          <button
            onClick={() => refetch()}
            className="text-sm text-[#8b5cf6] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* No Data State */}
      {!isLoading && !error && !currentBook && (
        <div className="text-center py-8">
          <p className="text-[#71717a] text-sm">No order book data available</p>
        </div>
      )}

      {/* Order Book */}
      {!isLoading && !error && currentBook && (
        <div className="p-4 space-y-4">
          {/* Column Headers */}
          <div className="grid grid-cols-3 text-xs text-[#71717a] font-medium">
            <div>Price</div>
            <div className="text-center">Size</div>
            <div className="text-right">Total</div>
          </div>

          {/* Asks (Sell orders) - reversed to show lowest at bottom */}
          <div className="space-y-1">
            {[...asks].reverse().map((level, index) => (
              <motion.div
                key={`ask-${index}-${level.price}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative grid grid-cols-3 text-sm py-1"
              >
                {/* Background bar */}
                <div
                  className="absolute inset-y-0 right-0 bg-[#ef4444]/10 transition-all duration-300"
                  style={{ width: `${Math.min(level.percentage * 3, 100)}%` }}
                />
                
                <div className="relative text-[#ef4444] font-medium">
                  {formatPrice(level.price)}
                </div>
                <div className="relative text-center text-[#a1a1aa]">
                  {formatSize(level.size)}
                </div>
                <div className="relative text-right text-[#71717a]">
                  {formatSize(level.total)}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Spread */}
          {showSpread && (
            <div className="flex items-center justify-center py-2 border-y border-[#27272a]">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[#71717a]">Spread:</span>
                <span className="font-medium text-[#a1a1aa]">
                  {formatPrice(spread)}
                </span>
                <span className="text-[#71717a]">|</span>
                <span className="text-[#71717a]">Mid:</span>
                <span className="font-medium text-[#8b5cf6]">
                  {formatPrice(midPrice)}
                </span>
              </div>
            </div>
          )}

          {/* Bids (Buy orders) */}
          <div className="space-y-1">
            {bids.map((level, index) => (
              <motion.div
                key={`bid-${index}-${level.price}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative grid grid-cols-3 text-sm py-1"
              >
                {/* Background bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-[#22c55e]/10 transition-all duration-300"
                  style={{ width: `${Math.min(level.percentage * 3, 100)}%` }}
                />
                
                <div className="relative text-[#22c55e] font-medium">
                  {formatPrice(level.price)}
                </div>
                <div className="relative text-center text-[#a1a1aa]">
                  {formatSize(level.size)}
                </div>
                <div className="relative text-right text-[#71717a]">
                  {formatSize(level.total)}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty state */}
          {bids.length === 0 && asks.length === 0 && (
            <div className="text-center py-4 text-[#71717a]">
              No orders yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============= Mini Order Book (for inline display) =============

interface MiniOrderBookProps {
  tokenId: string;
  levels?: number;
}

export function MiniOrderBook({ tokenId, levels = 3 }: MiniOrderBookProps) {
  const { data: book } = useOrderBook({ tokenId });

  if (!book) return null;

  const topBids = (book.bids || []).slice(0, levels);
  const topAsks = (book.asks || []).slice(0, levels);

  return (
    <div className="flex items-center gap-4 text-xs">
      {/* Best Bid */}
      <div className="flex items-center gap-1">
        <TrendingUp className="w-3 h-3 text-[#22c55e]" />
        <span className="text-[#22c55e]">
          {topBids[0] ? `${(parseFloat(topBids[0].price) * 100).toFixed(1)}¢` : "-"}
        </span>
      </div>
      
      {/* Best Ask */}
      <div className="flex items-center gap-1">
        <TrendingDown className="w-3 h-3 text-[#ef4444]" />
        <span className="text-[#ef4444]">
          {topAsks[0] ? `${(parseFloat(topAsks[0].price) * 100).toFixed(1)}¢` : "-"}
        </span>
      </div>
    </div>
  );
}
