"use client";

/**
 * Portfolio Page
 *
 * Shows user's positions, open orders, and trade history
 */

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import { useAccount } from "wagmi";
import { formatUsdc } from "@/lib/polymarket/marketApi";
import type { Order, Position } from "@/lib/polymarket/types";
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  Loader2,
  X,
  RefreshCw 
} from "lucide-react";

export default function PortfolioPage() {
  // Prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  const { isConnected } = useAccount();
  const { isConnected: isWalletConnected } = useWallet();
  const { clobClient, isTradingSessionComplete, safeAddress } = useTrading();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proxyWalletBalance, setProxyWalletBalance] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);

  const hasWallet = isConnected && isWalletConnected;
  const canTrade = hasWallet && isTradingSessionComplete && !!clobClient;

  // Fetch portfolio data
  const refreshBalances = useCallback(async () => {
    console.log('[Portfolio] refreshBalances called with:', {
      canTrade,
      hasWallet,
      isConnected,
      isWalletConnected,
      isTradingSessionComplete,
      hasClobClient: !!clobClient,
      safeAddress
    });
    
    if (!canTrade || !clobClient) {
      console.warn('[Portfolio] Cannot trade or no CLOB client:', { canTrade, hasClobClient: !!clobClient });
      return;
    }
    
    if (!safeAddress) {
      console.warn('[Portfolio] No safe address available yet');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[Portfolio] Starting data fetch, safeAddress:', safeAddress);
      
      // Fetch open orders directly from clobClient
      let ordersData: any[] = [];
      try {
        ordersData = await clobClient.getOpenOrders() as any[];
        console.log('[Portfolio] Raw orders received:', ordersData?.length || 0);
      } catch (orderError) {
        console.error('[Portfolio] Failed to fetch orders:', orderError);
      }
      const transformedOrders: Order[] = (ordersData as any[]).map((order) => ({
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
      console.log('[Portfolio] Transformed orders:', transformedOrders);
      setOpenOrders(transformedOrders);

      // Fetch positions from Polymarket Data API if we have safe address
      if (safeAddress) {
        try {
          // Use correct query parameter 'user' and optional filters
          const positionsUrl = `https://data-api.polymarket.com/positions?user=${safeAddress}&sizeThreshold=1&limit=100`;
          console.log('[Portfolio] Fetching positions from:', positionsUrl);
          
          const positionsResponse = await fetch(positionsUrl);
          console.log('[Portfolio] Positions response status:', positionsResponse.status);
          
          if (positionsResponse.ok) {
            const positionsData = await positionsResponse.json();
            console.log('[Portfolio] Raw positions received:', positionsData?.length || 0);
            // Map API response according to actual Polymarket API response
            const transformedPositions: Position[] = (positionsData as any[]).map((pos) => ({
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
            console.log('[Portfolio] Transformed positions:', transformedPositions);
            setPositions(transformedPositions);
          } else {
            const errorText = await positionsResponse.text();
            console.error('[Portfolio] Failed to fetch positions:', {
              status: positionsResponse.status,
              statusText: positionsResponse.statusText,
              errorBody: errorText
            });
            setPositions([]);
          }
        } catch (posError) {
          console.error('[Portfolio] Error fetching positions:', posError);
          setPositions([]);
        }
      } else {
        setPositions([]);
      }

      // Fetch balance and allowance using clobClient
      try {
        const balanceData = await clobClient.getBalanceAllowance({
          asset_type: 'COLLATERAL' as any
        });
        if (balanceData) {
          // Balance is in wei (6 decimals for USDC.e), convert to readable format
          const balanceInWei = parseFloat(balanceData.balance) || 0;
          const balanceInUsdc = balanceInWei / 1_000_000; // Convert from wei to USDC
          console.log('[Portfolio] Balance raw:', balanceData.balance, 'converted:', balanceInUsdc);
          setProxyWalletBalance(balanceInUsdc);
        } else {
          setProxyWalletBalance(0);
        }
      } catch (balanceError) {
        console.error('[Portfolio] Failed to fetch balance:', balanceError);
        setProxyWalletBalance(0);
      }

      console.log('[Portfolio] Successfully loaded data for orders:', transformedOrders.length);
    } catch (err) {
      console.error('[Portfolio] Failed to refresh balances:', err);
      setError('Failed to load portfolio data');
      setOpenOrders([]);
      setPositions([]);
      setProxyWalletBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [canTrade, clobClient, safeAddress, hasWallet, isConnected, isWalletConnected, isTradingSessionComplete]);

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    console.log('[Portfolio] Mount effect triggered:', { isMounted, canTrade, safeAddress });
    if (!isMounted) {
      console.log('[Portfolio] Component not mounted yet');
      return;
    }
    if (!canTrade) {
      console.log('[Portfolio] Cannot trade yet, skipping refresh');
      return;
    }
    console.log('[Portfolio] Calling refreshBalances...');
    refreshBalances();
  }, [isMounted, canTrade, safeAddress, refreshBalances]);

  const cancelUserOrder = async (_orderId: string) => {
    if (!clobClient) return;
    
    try {
      // TODO: Implement proper order cancellation
      // Note: cancelOrder expects OrderPayload, not just orderId string
      console.warn('[Portfolio] Order cancellation not fully implemented');
      setError('Order cancellation not implemented yet');
    } catch (err) {
      console.error('[Portfolio] Failed to cancel order:', err);
      setError('Failed to cancel order');
    }
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Portfolio</h1>
          {canTrade && (
            <button
              onClick={refreshBalances}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1e] hover:bg-[#252529] rounded-lg border border-[#27272a] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
        </div>

        {/* Not Connected */}
        {!hasWallet && (
          <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-12 text-center">
            <Wallet className="w-16 h-16 text-[#8b5cf6] mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Wallet</h2>
            <p className="text-[#a1a1aa]">
              Connect your wallet to view your portfolio
            </p>
          </div>
        )}

        {/* Connected but no trading credentials */}
        {hasWallet && !canTrade && (
          <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-12 text-center">
            <AlertCircle className="w-16 h-16 text-[#f59e0b] mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Setup Required</h2>
            <p className="text-[#a1a1aa] mb-4">
              Complete wallet setup to enable trading and view positions
            </p>
            <a
              href="/wallet"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] rounded-lg transition-colors"
            >
              Setup Wallet
            </a>
          </div>
        )}

        {/* Loading */}
        {canTrade && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
          </div>
        )}

        {/* Portfolio Content */}
        {canTrade && !isLoading && (
          <div className="space-y-8">
            {/* Balance Card */}
            <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#8b5cf6]" />
                Trading Balance
              </h2>
              <div className="text-4xl font-bold text-[#22c55e]">
                {formatUsdc(proxyWalletBalance)}
              </div>
              <p className="text-sm text-[#71717a] mt-1">USDC.e in Proxy Wallet</p>
            </div>

            {/* Positions */}
            <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#8b5cf6]" />
                Positions ({positions.length})
              </h2>

              {positions.length === 0 ? (
                <p className="text-[#71717a] text-center py-8">
                  No open positions. Start trading to see your positions here.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#27272a]">
                        <th className="text-left py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Market
                        </th>
                        <th className="text-left py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Outcome
                        </th>
                        <th className="text-right py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Shares
                        </th>
                        <th className="text-right py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Avg Price
                        </th>
                        <th className="text-right py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Current
                        </th>
                        <th className="text-right py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          P&L
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position, i) => (
                        <tr
                          key={i}
                          className="border-b border-[#27272a] hover:bg-[#1a1a1e]"
                        >
                          <td className="py-3 px-4">
                            <a
                              href={`/markets/${position.condition_id}`}
                              className="text-white hover:text-[#8b5cf6]"
                            >
                              {typeof position.market === 'string' ? position.market : position.market?.question || position.condition_id}
                            </a>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                position.outcome === "Yes"
                                  ? "bg-[#22c55e]/20 text-[#22c55e]"
                                  : "bg-[#ef4444]/20 text-[#ef4444]"
                              }`}
                            >
                              {position.outcome}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {position.size.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            ${position.avgPrice.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            ${position.price.toFixed(4)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-medium ${
                              position.unrealizedPnl >= 0
                                ? "text-[#22c55e]"
                                : "text-[#ef4444]"
                            }`}
                          >
                            {position.unrealizedPnl >= 0 ? "+" : ""}
                            ${Math.abs(position.unrealizedPnl).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Open Orders */}
            <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#8b5cf6]" />
                Open Orders ({openOrders.length})
              </h2>

              {openOrders.length === 0 ? (
                <p className="text-[#71717a] text-center py-8">
                  No open orders.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#27272a]">
                        <th className="text-left py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Market
                        </th>
                        <th className="text-left py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Side
                        </th>
                        <th className="text-right py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Price
                        </th>
                        <th className="text-right py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Size
                        </th>
                        <th className="text-right py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Filled
                        </th>
                        <th className="text-right py-3 px-4 text-sm text-[#a1a1aa] font-medium">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {openOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-[#27272a] hover:bg-[#1a1a1e]"
                        >
                          <td className="py-3 px-4 max-w-[200px] truncate">
                            {order.market}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                order.side === "BUY"
                                  ? "bg-[#22c55e]/20 text-[#22c55e]"
                                  : "bg-[#ef4444]/20 text-[#ef4444]"
                              }`}
                            >
                              {order.side}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            ${parseFloat(order.price).toFixed(3)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {parseFloat(order.original_size).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {parseFloat(order.size_matched).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => cancelUserOrder(order.id)}
                              className="p-2 text-[#a1a1aa] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors"
                              title="Cancel order"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-[#ef4444] flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
