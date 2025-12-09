"use client";

/**
 * Positions Panel Component
 * 
 * Displays user's open positions, orders, and trade history
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import type { Order, Trade, Position } from "@/lib/polymarket/types";
import { Loader2, X, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

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
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isServiceInitialized = isConnected && isTradingSessionComplete && !!clobClient;

  // Fetch positions, orders, and history
  useEffect(() => {
    if (!isServiceInitialized) {
      console.debug("[PositionsPanel] Trading service not initialized");
      setPositions([]);
      setOrders([]);
      setHistory([]);
      return;
    }
    
    if (!safeAddress) {
      console.warn("[PositionsPanel] No safe address available yet");
      return;
    }

    const fetchData = async () => {
      console.log("[PositionsPanel] fetchData called with:", {
        isServiceInitialized,
        isConnected,
        isTradingSessionComplete,
        hasClobClient: !!clobClient,
        safeAddress
      });
      
      setIsLoading(true);
      setError(null);

      try {
        console.log("[PositionsPanel] Starting data fetch, safeAddress:", safeAddress);
        
        // Fetch open orders and trade history using clobClient and Data API
        let ordersData: any[] = [];
        let historyData: any[] = [];
        
        try {
          ordersData = await clobClient.getOpenOrders() as any[];
        } catch (orderError) {
          console.error("[PositionsPanel] Failed to fetch orders:", orderError);
        }
        
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('limit', '100');
          queryParams.append('user', safeAddress!);
          const tradesUrl = `https://data-api.polymarket.com/trades?${queryParams.toString()}`;
          console.log("[PositionsPanel] Fetching trades from:", tradesUrl);
          const tradesResponse = await fetch(tradesUrl);
          if (tradesResponse.ok) {
            historyData = await tradesResponse.json();
          }
        } catch (historyError) {
          console.error("[PositionsPanel] Failed to fetch trade history:", historyError);
        }
        
        console.log("[PositionsPanel] Raw data received:", {
          ordersCount: ordersData?.length || 0,
          historyCount: historyData?.length || 0
        });

        // Transform orders
        let transformedOrders: Order[] = (ordersData as any[]).map((order) => ({
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
          status: order.status
        }));
        
        // Filter by market if marketId provided
        if (marketId) {
          transformedOrders = transformedOrders.filter(
            order => order.asset_id === marketId || order.market === marketId
          );
        }
        
        console.log("[PositionsPanel] Transformed orders:", transformedOrders);
        setOrders(transformedOrders);

        // Transform trade history
        let transformedHistory: Trade[] = (historyData as any[]).map((trade) => ({
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
          transaction_hash: trade.transaction_hash
        }));
        
        // Filter by market if marketId provided
        if (marketId) {
          transformedHistory = transformedHistory.filter(
            trade => trade.asset_id === marketId || trade.market === marketId
          );
        }
        
        console.log("[PositionsPanel] Transformed history:", transformedHistory);
        setHistory(transformedHistory);

        // Fetch positions from Polymarket Data API if we have safe address
        if (safeAddress) {
          try {
            // Use correct query parameter 'user' and optional filters
            const queryParams = new URLSearchParams();
            queryParams.append('user', safeAddress);
            queryParams.append('sizeThreshold', '1');
            queryParams.append('limit', '100');
            const positionsUrl = `https://data-api.polymarket.com/positions?${queryParams.toString()}`;
            console.log("[PositionsPanel] Fetching positions from:", positionsUrl, { marketId });
            
            const positionsResponse = await fetch(positionsUrl);
            console.log("[PositionsPanel] Positions response status:", positionsResponse.status);
            
            if (positionsResponse.ok) {
              const positionsData = await positionsResponse.json();
              console.log("[PositionsPanel] Raw positions received:", positionsData?.length || 0);
              // Map API response according to official documentation
              let transformedPositions: Position[] = (positionsData as any[]).map((pos) => ({
                asset: pos.asset || "",
                condition_id: pos.conditionId || "",
                market: pos.title || "", // Use title from API
                outcome: pos.outcome || "",
                price: pos.curPrice || 0, // Current market price (from curPrice)
                size: pos.size || 0, // Current position size
                value: pos.currentValue || 0, // Current value (from currentValue)
                avgPrice: pos.avgPrice || 0, // Average entry price
                realizedPnl: pos.realizedPnl || 0, // Realized PnL
                unrealizedPnl: pos.cashPnl || 0 // Unrealized PnL (from cashPnl)
              }));
              
              // Filter by market if marketId provided
              if (marketId) {
                transformedPositions = transformedPositions.filter(
                  pos => pos.condition_id === marketId || pos.asset === marketId
                );
                console.log("[PositionsPanel] Filtered positions by market:", {
                  marketId,
                  count: transformedPositions.length
                });
              }
              
              console.log("[PositionsPanel] Transformed positions:", transformedPositions);
              setPositions(transformedPositions);
            } else {
              const errorText = await positionsResponse.text();
              console.error("[PositionsPanel] Failed to fetch positions:", {
                status: positionsResponse.status,
                statusText: positionsResponse.statusText,
                errorBody: errorText
              });
              setPositions([]);
            }
          } catch (posError) {
            console.error("[PositionsPanel] Error fetching positions:", posError);
            setPositions([]);
          }
        } else {
          setPositions([]);
        }

        console.log("[PositionsPanel] Successfully loaded:", {
          orders: orders.length,
          history: history.length,
          positions: positions.length
        });
      } catch (err) {
        console.error("[PositionsPanel] Error loading data:", err);
        setError("Failed to load trading data");
        setOrders([]);
        setHistory([]);
        setPositions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [isServiceInitialized, clobClient, safeAddress, marketId]);

  const handleCancelOrder = async (orderId: string) => {
    if (!isServiceInitialized || !clobClient) {
      setError("Trading service not initialized");
      return;
    }

    try {
      // TODO: Implement proper order cancellation with CLOB client
      // Note: cancelOrder expects OrderPayload, not just orderId string
      console.warn('[PositionsPanel] Order cancellation not fully implemented');
      setError("Order cancellation not implemented yet");
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setError("Failed to cancel order");
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
