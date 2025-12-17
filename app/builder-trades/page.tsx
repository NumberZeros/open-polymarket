"use client";

/**
 * Builder Trades Page
 *
 * Displays all trades attributed to the builder account
 * Shows trade history with filtering, pagination, and detailed information
 * 
 * @metadata
 * title: Builder Trades
 * description: Track all trades routed through your builder platform
 * @see https://docs.polymarket.com/developers/CLOB/clients/methods-builder#getbuildertrades
 */

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import { useAccount } from "wagmi";
import useBuilderTrades, { TradeParams, BuilderTrade } from "@/hooks/useBuilderTrades";
import { formatUsdc } from "@/lib/polymarket/marketApi";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Filter,
  Eye,
} from "lucide-react";

// Helper function to safely format dates
function formatTradeTime(timeString: string | null | undefined): string {
  if (!timeString) return "N/A";
  
  try {
    // Try to parse the date
    const date = new Date(parseInt(timeString)*1000);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Try parsing as timestamp in milliseconds
      const timestamp = parseInt(timeString)*1000;
      if (!isNaN(timestamp)) {
        return new Date(timestamp).toLocaleString();
      }
      return "Invalid Date";
    }
    
    return date.toLocaleString();
  } catch {
    return "Invalid Date";
  }
}

export default function BuilderTradesPage() {
  // Prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  const { isConnected } = useAccount();
  const { isConnected: isWalletConnected } = useWallet();
  const { isTradingSessionComplete } = useTrading();
  const { 
    trades, 
    isLoading, 
    error, 
    hasMore, 
    totalCount,
    fetchTrades, 
    fetchNext,
    reset 
  } = useBuilderTrades();

  // Filter state
  const [filterMarket, setFilterMarket] = useState<string>("");
  const [filterAssetId, setFilterAssetId] = useState<string>("");
  const [filterMaker, setFilterMaker] = useState<string>("");
  const [filterSide, setFilterSide] = useState<"" | "buy" | "sell">("");
  const [selectedTrade, setSelectedTrade] = useState<BuilderTrade | null>(null);

  const hasWallet = isConnected && isWalletConnected;
  const isAuthorized = hasWallet && isTradingSessionComplete === true;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Not connected
  if (!hasWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-amber-500" />
            <h1 className="text-3xl font-bold text-white">Wallet Required</h1>
            <p className="text-gray-400 max-w-md">
              Connect your wallet to view builder trades
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-amber-500" />
            <h1 className="text-3xl font-bold text-white">Trading Session Required</h1>
            <p className="text-gray-400 max-w-md">
              Complete trading setup to view builder trades
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Handle filter application
  const handleApplyFilters = () => {
    const params: TradeParams = {};
    if (filterMarket) params.market = filterMarket;
    if (filterAssetId) params.asset_id = filterAssetId;
    if (filterMaker) params.maker_address = filterMaker;
    fetchTrades(params);
  };

  const handleReset = () => {
    setFilterMarket("");
    setFilterAssetId("");
    setFilterMaker("");
    setFilterSide("");
    reset();
    fetchTrades();
  };

  const handleRefresh = () => {
    fetchTrades();
  };

  // Filter trades based on selected side
  const filteredTrades = filterSide
    ? trades.filter((t) => t.side.toLowerCase() === filterSide.toLowerCase())
    : trades;

  const tradesPerPage = 10;
  const paginatedTrades = filteredTrades.slice(0, tradesPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col">
      <Header />

      <main className="flex-1 px-4 py-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Builder Trades</h1>
              <p className="text-gray-400">
                Track all trades routed through your builder platform
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-gray-400 text-sm">Total Trades</p>
              <p className="text-2xl font-bold text-white">{totalCount}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-gray-400 text-sm">Buy Trades</p>
              <p className="text-2xl font-bold text-green-400">
                {trades.filter((t) => t.side.toLowerCase() === "buy").length}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-gray-400 text-sm">Sell Trades</p>
              <p className="text-2xl font-bold text-red-400">
                {trades.filter((t) => t.side.toLowerCase() === "sell").length}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-gray-400 text-sm">Status</p>
              <p className="text-2xl font-bold text-blue-400">
                {isLoading ? "Loading..." : "Ready"}
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400">Error Loading Trades</h3>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-white">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Market
              </label>
              <input
                type="text"
                value={filterMarket}
                onChange={(e) => setFilterMarket(e.target.value)}
                placeholder="Market ID..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Asset ID
              </label>
              <input
                type="text"
                value={filterAssetId}
                onChange={(e) => setFilterAssetId(e.target.value)}
                placeholder="Asset ID..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Maker Address
              </label>
              <input
                type="text"
                value={filterMaker}
                onChange={(e) => setFilterMaker(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Side
              </label>
              <select
                value={filterSide}
                onChange={(e) => setFilterSide(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All Sides</option>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors text-sm font-medium"
            >
              Apply Filters
            </button>
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded transition-colors text-sm font-medium"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && trades.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading builder trades...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && trades.length === 0 && !error && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Trades Found</h3>
            <p className="text-gray-500">
              No builder trades match your filters. Try adjusting them or check back later.
            </p>
          </div>
        )}

        {/* Trades Table */}
        {trades.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                      Trade ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                      Side
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                      Size (USDC)
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                      Fee
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                      Time
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrades.map((trade) => (
                    <tr
                      key={trade.id}
                      className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                        {trade.id.slice(0, 8)}...{trade.id.slice(-8)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium flex items-center gap-1 w-fit ${
                            trade.side.toLowerCase() === "buy"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {trade.side.toLowerCase() === "buy" ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        ${parseFloat(trade.price).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatUsdc(parseFloat(trade.sizeUsdc))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatUsdc(parseFloat(trade.feeUsdc))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.status === "PENDING"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : trade.status === "FILLED"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {trade.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {formatTradeTime(trade.matchTime)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedTrade(trade)}
                          className="inline-flex items-center justify-center p-1 text-blue-400 hover:text-blue-300 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {tradesPerPage < filteredTrades.length && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Showing {paginatedTrades.length} of {filteredTrades.length} trades
                </p>
                {hasMore && (
                  <button
                    onClick={fetchNext}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors text-sm"
                  >
                    Load More
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Trade Details Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="sticky top-0 flex items-center justify-between p-6 bg-slate-800 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Trade Details</h2>
              <button
                onClick={() => setSelectedTrade(null)}
                className="text-gray-400 hover:text-gray-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Trade ID</p>
                  <p className="text-white font-mono text-sm break-all">{selectedTrade.id}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Builder</p>
                  <p className="text-white font-mono text-sm break-all">{selectedTrade.builder}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Market</p>
                  <p className="text-white font-mono text-sm break-all">{selectedTrade.market}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Asset ID</p>
                  <p className="text-white font-mono text-sm break-all">{selectedTrade.assetId}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Side</p>
                  <p
                    className={`text-sm font-semibold flex items-center gap-1 w-fit ${
                      selectedTrade.side.toLowerCase() === "buy"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {selectedTrade.side.toLowerCase() === "buy" ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {selectedTrade.side}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Price</p>
                  <p className="text-white font-semibold">${parseFloat(selectedTrade.price).toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Size</p>
                  <p className="text-white font-semibold">{selectedTrade.size} units</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Size (USDC)</p>
                  <p className="text-white font-semibold">${formatUsdc(parseFloat(selectedTrade.sizeUsdc))}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Fee</p>
                  <p className="text-white font-semibold">${formatUsdc(parseFloat(selectedTrade.feeUsdc))}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <p
                    className={`text-sm font-semibold ${
                      selectedTrade.status === "FILLED"
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {selectedTrade.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Outcome</p>
                  <p className="text-white">{selectedTrade.outcome}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Owner</p>
                  <p className="text-white font-mono text-sm break-all">{selectedTrade.owner}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Maker</p>
                  <p className="text-white font-mono text-sm break-all">{selectedTrade.maker}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Match Time</p>
                  <p className="text-white">
                    {formatTradeTime(selectedTrade.matchTime)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Created At</p>
                  <p className="text-white">
                    {formatTradeTime(selectedTrade.createdAt)}
                  </p>
                </div>
                {selectedTrade.transactionHash && (
                  <div className="col-span-2">
                    <p className="text-gray-400 text-sm">Transaction Hash</p>
                    <a
                      href={`https://polygonscan.com/tx/${selectedTrade.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-mono text-sm break-all"
                    >
                      {selectedTrade.transactionHash}
                    </a>
                  </div>
                )}
                {selectedTrade.err_msg && (
                  <div className="col-span-2 bg-red-500/10 border border-red-500/50 rounded p-3">
                    <p className="text-gray-400 text-sm mb-1">Error</p>
                    <p className="text-red-400 text-sm">{selectedTrade.err_msg}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
