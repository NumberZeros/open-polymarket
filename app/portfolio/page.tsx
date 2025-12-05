"use client";

/**
 * Portfolio Page
 *
 * Shows user's positions, open orders, and trade history
 */

import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { usePolymarket } from "@/contexts/PolymarketContext";
import { formatUsdc } from "@/lib/polymarket/marketApi";
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
  const {
    status,
    isLoading,
    error,
    usdcBalance,
    positions,
    openOrders,
    refreshBalances,
    cancelUserOrder,
  } = usePolymarket();

  useEffect(() => {
    if (status.canTrade) {
      refreshBalances();
    }
  }, [status.canTrade, refreshBalances]);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Portfolio</h1>
          {status.canTrade && (
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
        {!status.hasWallet && (
          <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-12 text-center">
            <Wallet className="w-16 h-16 text-[#8b5cf6] mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Wallet</h2>
            <p className="text-[#a1a1aa]">
              Connect your wallet to view your portfolio
            </p>
          </div>
        )}

        {/* Connected but no trading credentials */}
        {status.hasWallet && !status.canTrade && (
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
        {status.canTrade && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
          </div>
        )}

        {/* Portfolio Content */}
        {status.canTrade && !isLoading && (
          <div className="space-y-8">
            {/* Balance Card */}
            <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#8b5cf6]" />
                Balance
              </h2>
              <div className="text-4xl font-bold text-[#22c55e]">
                {formatUsdc(usdcBalance)}
              </div>
              <p className="text-sm text-[#71717a] mt-1">USDC.e on Polygon</p>
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
                              {position.market?.question || position.condition_id}
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
                            ${position.avgPrice.toFixed(3)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            ${position.price.toFixed(3)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-medium ${
                              position.unrealizedPnl >= 0
                                ? "text-[#22c55e]"
                                : "text-[#ef4444]"
                            }`}
                          >
                            {position.unrealizedPnl >= 0 ? "+" : ""}
                            ${position.unrealizedPnl.toFixed(2)}
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
