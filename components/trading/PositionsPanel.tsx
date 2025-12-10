"use client";

/**
 * Positions Panel Component
 * 
 * Displays user's open positions, orders, and trade history
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import { usePositions, useOrders, useTrades } from "@/hooks/usePortfolio";
import type { Order, Trade, Position } from "@/lib/polymarket/types";
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Trash2 } from "lucide-react";

type TabType = "positions" | "orders" | "history";

interface PositionsPanelProps {
  /**
   * Optional market ID to filter positions/orders/history
   * If provided, only shows data related to this market
   * If not provided, shows all user positions/orders/history
   */
  marketId?: string;
}

export function PositionsPanel({ marketId }: PositionsPanelProps = {}) {
  const { isConnected } = useWallet();
  const { clobClient, isTradingSessionComplete, safeAddress } = useTrading();
  
  const [activeTab, setActiveTab] = useState<TabType>("positions");
  const [error, setError] = useState<string | null>(null);

  const isServiceInitialized = isConnected && isTradingSessionComplete && !!clobClient;

  // Use React Query hooks for data fetching
  const { 
    data: allPositions = [], 
    isLoading: isLoadingPositions 
  } = usePositions({ 
    safeAddress, 
    enabled: isServiceInitialized 
  });

  const { 
    data: allOrders = [], 
    isLoading: isLoadingOrders 
  } = useOrders({ 
    safeAddress, 
    clobClient, 
    enabled: isServiceInitialized 
  });

  const { 
    data: allHistory = [], 
    isLoading: isLoadingHistory 
  } = useTrades({ 
    safeAddress, 
    enabled: isServiceInitialized 
  });

  // Filter data by marketId if provided
  const positions = useMemo(() => {
    if (!marketId) return allPositions;
    return allPositions.filter(
      pos => pos.condition_id === marketId || pos.asset === marketId
    );
  }, [allPositions, marketId]);

  const orders = useMemo(() => {
    if (!marketId) return allOrders;
    return allOrders.filter(
      order => order.asset_id === marketId || order.market === marketId
    );
  }, [allOrders, marketId]);

  const history = useMemo(() => {
    if (!marketId) return allHistory;
    return allHistory.filter(
      trade => trade.asset_id === marketId || trade.market === marketId
    );
  }, [allHistory, marketId]);

  const isLoading = isLoadingPositions || isLoadingOrders || isLoadingHistory;

  const handleCancelOrder = async (orderId: string) => {
    if (!isServiceInitialized || !clobClient) {
      setError("Trading service not initialized");
      return;
    }

    setError(null);

    try {
      console.log('[PositionsPanel] Cancelling order:', orderId);
      
      // Cancel order using CLOB client
      await clobClient.cancelOrder({ orderID: orderId });
      
      console.log('[PositionsPanel] ✅ Order cancelled successfully');
      
      // Refresh orders list
      // The useOrders hook will automatically refetch
      
    } catch (err) {
      console.error('[PositionsPanel] Failed to cancel order:', err);
      setError(err instanceof Error ? err.message : "Failed to cancel order");
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-8 text-center">
        <AlertCircle className="w-12 h-12 text-[#71717a] mx-auto mb-3" />
        <p className="text-[#a1a1aa]">Connect wallet to view your positions</p>
      </div>
    );
  }

  return (
    <div className="bg-[#16161a] rounded-xl border border-[#27272a] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#27272a]">
        <button
          onClick={() => setActiveTab("positions")}
          className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
            activeTab === "positions"
              ? "text-[#8b5cf6] border-b-2 border-[#8b5cf6]"
              : "text-[#a1a1aa] hover:text-white"
          }`}
        >
          Positions ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
            activeTab === "orders"
              ? "text-[#8b5cf6] border-b-2 border-[#8b5cf6]"
              : "text-[#a1a1aa] hover:text-white"
          }`}
        >
          Open Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
            activeTab === "history"
              ? "text-[#8b5cf6] border-b-2 border-[#8b5cf6]"
              : "text-[#a1a1aa] hover:text-white"
          }`}
        >
          History ({history.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#8b5cf6]" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-[#ef4444] text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <AnimatePresence mode="wait">
            {activeTab === "positions" && (
              <motion.div
                key="positions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {positions.length === 0 ? (
                  <p className="text-center text-[#71717a] py-8">No open positions</p>
                ) : (
                  <div className="space-y-3">
                    {positions.map((position, index) => (
                      <PositionCard key={`${position.asset}-${index}`} position={position} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "orders" && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {orders.length === 0 ? (
                  <p className="text-center text-[#71717a] py-8">No open orders</p>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        onCancel={() => handleCancelOrder(order.id)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {history.length === 0 ? (
                  <p className="text-center text-[#71717a] py-8">No trade history</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((trade) => (
                      <TradeCard key={trade.id} trade={trade} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ============= Sub Components =============

function PositionCard({ position }: { position: Position }) {
  const unrealizedPnl = position.unrealizedPnl || 0;
  const realizedPnl = position.realizedPnl || 0;
  const totalPnl = unrealizedPnl + realizedPnl;
  const cost = position.size * position.avgPrice;
  const pnlPercent = cost > 0 ? (totalPnl / cost) * 100 : 0;
  const isProfit = totalPnl >= 0;

  return (
    <div className="bg-[#1a1a1e] rounded-lg p-4 border border-[#27272a]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">{position.outcome}</span>
          </div>
          <p className="text-xs text-[#71717a] line-clamp-1">
            {typeof position.market === 'string' ? position.market : position.market?.question}
          </p>
        </div>
        <div className="text-right">
          <div className={`font-semibold ${isProfit ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {isProfit ? "+" : ""}{totalPnl.toFixed(2)} USDC
          </div>
          <div className={`text-xs ${isProfit ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {isProfit ? "+" : ""}{pnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#27272a]">
        <div>
          <p className="text-xs text-[#71717a]">Size</p>
          <p className="text-sm font-medium">{position.size.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-[#71717a]">Avg Price</p>
          <p className="text-sm font-medium">${position.avgPrice.toFixed(3)}</p>
        </div>
        <div>
          <p className="text-xs text-[#71717a]">Value</p>
          <p className="text-sm font-medium">${position.value.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onCancel }: { order: Order; onCancel: () => void }) {
  const isBuy = order.side === "BUY";
  const fillPercent = parseFloat(order.original_size) > 0
    ? (parseFloat(order.size_matched) / parseFloat(order.original_size)) * 100
    : 0;

  return (
    <div className="bg-[#1a1a1e] rounded-lg p-4 border border-[#27272a]">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${isBuy ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              {order.side}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">
              {order.type || "GTC"}
            </span>
          </div>
          <p className="text-sm font-medium mb-1">{order.outcome || "Unknown"}</p>
          <p className="text-xs text-[#71717a] line-clamp-1">Market: {order.market}</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-[#ef4444]/10 rounded-lg transition-colors group"
          title="Cancel order"
        >
          <Trash2 className="w-4 h-4 text-[#71717a] group-hover:text-[#ef4444]" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#27272a]">
        <div>
          <p className="text-xs text-[#71717a]">Price</p>
          <p className="text-sm font-medium">${parseFloat(order.price).toFixed(3)}</p>
        </div>
        <div>
          <p className="text-xs text-[#71717a]">Size</p>
          <p className="text-sm font-medium">{parseFloat(order.original_size).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-[#71717a]">Filled</p>
          <p className="text-sm font-medium">
            {fillPercent.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}

function TradeCard({ trade }: { trade: Trade }) {
  const isBuy = trade.side === "BUY";
  const time = new Date(trade.match_time);

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-[#1a1a1e] rounded-lg transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
          isBuy ? "bg-[#22c55e]/10" : "bg-[#ef4444]/10"
        }`}>
          {isBuy ? (
            <TrendingUp className="w-4 h-4 text-[#22c55e]" />
          ) : (
            <TrendingDown className="w-4 h-4 text-[#ef4444]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isBuy ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              {trade.side}
            </span>
            <span className="text-sm text-white">{trade.outcome || "Unknown"}</span>
          </div>
          <p className="text-xs text-[#71717a]">
            {parseFloat(trade.size).toFixed(2)} @ ${parseFloat(trade.price).toFixed(3)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">
          ${(parseFloat(trade.size) * parseFloat(trade.price)).toFixed(2)}
        </div>
        <p className="text-xs text-[#71717a]">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
