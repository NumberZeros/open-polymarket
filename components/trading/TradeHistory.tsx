/**
 * Trade History Component
 * 
 * Displays recent trades for a market with real-time updates.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMarketTrades } from "@/lib/polymarket/marketApi";
import { useLiveTrades } from "@/stores/websocketStore";
import { Loader2, ArrowUpRight, ArrowDownRight, History, Zap } from "lucide-react";
import type { Trade } from "@/lib/polymarket/types";
import type { TradeUpdate } from "@/lib/polymarket/websocket";

// ============= Types =============

interface TradeHistoryProps {
  marketId: string;
  _tokenId?: string;
  limit?: number;
  showLive?: boolean;
}

interface DisplayTrade {
  id: string;
  side: "BUY" | "SELL";
  price: string;
  size: string;
  timestamp: number;
  isLive?: boolean;
}

// ============= Component =============

export function TradeHistory({
  marketId,
  _tokenId,
  limit = 20,
  showLive = true,
}: TradeHistoryProps) {
  const [historicalTrades, setHistoricalTrades] = useState<DisplayTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live trades from WebSocket
  const liveTrades = useLiveTrades(showLive ? marketId : undefined, limit);

  // Fetch historical trades
  const fetchTrades = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const trades = await getMarketTrades(marketId, { limit });
      const displayTrades: DisplayTrade[] = trades.slice(0, limit).map((trade: Trade) => ({
        id: trade.id,
        side: trade.side,
        price: trade.price,
        size: trade.size,
        timestamp: new Date(trade.match_time || Date.now()).getTime(),
      }));
      setHistoricalTrades(displayTrades);
    } catch (err) {
      console.error("[TradeHistory] Error:", err);
      setError("Failed to load trades");
    } finally {
      setIsLoading(false);
    }
  }, [marketId, limit]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Merge live and historical trades
  const allTrades: DisplayTrade[] = [
    ...liveTrades.map((t: TradeUpdate) => ({
      id: t.id,
      side: t.side,
      price: t.price,
      size: t.size,
      timestamp: t.timestamp,
      isLive: true,
    })),
    ...historicalTrades,
  ].slice(0, limit);

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-[#16161a] rounded-xl border border-[#27272a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#8b5cf6]" />
          <span className="font-medium">Recent Trades</span>
        </div>
        
        {showLive && liveTrades.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#22c55e]">
            <Zap className="w-3 h-3" />
            <span>Live</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#8b5cf6] animate-spin" />
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-8">
            <p className="text-[#ef4444] text-sm mb-2">{error}</p>
            <button
              onClick={fetchTrades}
              className="text-sm text-[#8b5cf6] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && allTrades.length === 0 && (
          <div className="text-center py-8 text-[#71717a]">
            No trades yet
          </div>
        )}

        {!isLoading && !error && allTrades.length > 0 && (
          <div className="divide-y divide-[#27272a]">
            <AnimatePresence>
              {allTrades.map((trade) => (
                <motion.div
                  key={trade.id}
                  initial={trade.isLive ? { backgroundColor: "rgba(139, 92, 246, 0.2)" } : false}
                  animate={{ backgroundColor: "transparent" }}
                  transition={{ duration: 1 }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1e] transition-colors"
                >
                  {/* Side & Price */}
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${
                      trade.side === "BUY" 
                        ? "bg-[#22c55e]/10 text-[#22c55e]" 
                        : "bg-[#ef4444]/10 text-[#ef4444]"
                    }`}>
                      {trade.side === "BUY" ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className={`font-medium ${
                        trade.side === "BUY" ? "text-[#22c55e]" : "text-[#ef4444]"
                      }`}>
                        {trade.side}
                      </div>
                      <div className="text-xs text-[#71717a]">
                        {(parseFloat(trade.price) * 100).toFixed(1)}¢
                      </div>
                    </div>
                  </div>

                  {/* Size */}
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      ${parseFloat(trade.size).toFixed(2)}
                    </div>
                    <div className="text-xs text-[#71717a]">
                      {formatTime(trade.timestamp)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
