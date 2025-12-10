"use client";

/**
 * Market Detail Client Component
 *
 * Interactive market view with trading functionality,
 * price charts, order book, and trade history.
 */

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { OrderForm } from "@/components/trading/OrderForm";
import { PriceChart } from "@/components/charts/PriceChart";
import { LiveOrderBook } from "@/components/trading/LiveOrderBook";
import { TradeHistory } from "@/components/trading/TradeHistory";
import { PositionsPanel } from "@/components/trading/PositionsPanel";
import { 
  parseOutcomePrices,
  formatPercent,
} from "@/lib/polymarket/marketApi";
import type { Market } from "@/lib/polymarket/types";
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  TrendingUp,
  TrendingDown,
  ExternalLink,
  BarChart3,
  Share2,
  Bookmark,
  AlertCircle,
} from "lucide-react";
import { toast, Toaster } from "sonner";

interface MarketDetailClientProps {
  market: Market;
}

export function MarketDetailClient({ market }: MarketDetailClientProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<"Yes" | "No">("Yes");
  const [activeTab, setActiveTab] = useState<"chart" | "orderbook" | "trades">("chart");

  const prices = parseOutcomePrices(market);
  
  // Safely get tokens if they exist, otherwise construct from clobTokenIds
  const tokensArray = market.tokens && Array.isArray(market.tokens) ? market.tokens : [];
  
  // Fallback: If no tokens array, construct from clobTokenIds
  let yesToken = tokensArray.find((t) => t.outcome === "Yes");
  let noToken = tokensArray.find((t) => t.outcome === "No");
  
  // If tokens not found but clobTokenIds exists, construct tokens
  if (!yesToken && !noToken && market.clobTokenIds) {
    try {
      let tokenIds: string[] = [];
      if (typeof market.clobTokenIds === 'string') {
        tokenIds = JSON.parse(market.clobTokenIds);
      } else if (Array.isArray(market.clobTokenIds)) {
        tokenIds = market.clobTokenIds;
      }
      
      // Parse outcomes
      const outcomes = typeof market.outcomes === 'string' 
        ? JSON.parse(market.outcomes) 
        : market.outcomes;
      
      if (Array.isArray(outcomes) && tokenIds.length >= 2) {
        // Find Yes and No token IDs
        const yesIndex = outcomes.findIndex((o: string) => o.toLowerCase() === "yes");
        const noIndex = outcomes.findIndex((o: string) => o.toLowerCase() === "no");
        
        if (yesIndex >= 0 && tokenIds[yesIndex]) {
          yesToken = {
            token_id: tokenIds[yesIndex].replace(/^["']|["']$/g, '').trim(),
            outcome: "Yes",
            price: prices.yes,
            winner: false,
          };
        }
        
        if (noIndex >= 0 && tokenIds[noIndex]) {
          noToken = {
            token_id: tokenIds[noIndex].replace(/^["']|["']$/g, '').trim(),
            outcome: "No",
            price: prices.no,
            winner: false,
          };
        }
      }
    } catch (err) {
      // Failed to parse clobTokenIds, will use fallback
    }
  }
  
  const selectedToken = selectedOutcome === "Yes" ? yesToken : noToken;
  const selectedPrice = selectedToken?.price ?? (selectedOutcome === "Yes" ? prices.yes : prices.no);

  // Support both camelCase and snake_case from different APIs
  const endDate = market.endDateIso || market.end_date_iso ? new Date(market.endDateIso || market.end_date_iso || '') : null;
  const isActive = market.active && !market.closed;

  // Share market
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
      <Toaster position="top-right" theme="dark" />
      
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[#a1a1aa] hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#16161a] rounded-xl border border-[#27272a] overflow-hidden"
          >
            {/* Image */}
            {market.image && (
              <div className="relative h-40 md:h-48 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={market.image}
                  alt={market.question}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#16161a] to-transparent" />
                
                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 bg-black/50 backdrop-blur rounded-lg hover:bg-black/70 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-black/50 backdrop-blur rounded-lg hover:bg-black/70 transition-colors">
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="p-6">
              {/* Question */}
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-3">
                {market.question}
              </h1>

              {/* Description */}
              {market.description && (
                <p className="text-[#a1a1aa] text-sm md:text-base mb-4 line-clamp-3">
                  {market.description}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-3 text-sm text-[#71717a]">
                {market.volume && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27272a]/50 rounded-lg">
                    <Users className="w-4 h-4" />
                    <span>${parseFloat(market.volume).toLocaleString()}</span>
                  </div>
                )}
                {endDate && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27272a]/50 rounded-lg">
                    <Clock className="w-4 h-4" />
                    <span>
                      {endDate > new Date()
                        ? `Ends ${endDate.toLocaleDateString()}`
                        : `Ended ${endDate.toLocaleDateString()}`}
                    </span>
                  </div>
                )}
                {!isActive && (
                  <span className="px-3 py-1.5 bg-[#ef4444]/10 text-[#ef4444] rounded-lg">
                    {market.closed ? "Closed" : "Inactive"}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Outcome Selection */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#16161a] rounded-xl border border-[#27272a] p-4 md:p-6"
          >
            <h2 className="font-semibold mb-4">Select Outcome</h2>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {/* Yes */}
              <button
                onClick={() => setSelectedOutcome("Yes")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedOutcome === "Yes"
                    ? "border-[#22c55e] bg-[#22c55e]/10"
                    : "border-[#27272a] hover:border-[#3f3f46]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Yes</span>
                  <TrendingUp className="w-4 h-4 text-[#22c55e]" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-[#22c55e]">
                  {formatPercent(prices.yes)}
                </div>
                {yesToken?.winner && (
                  <span className="inline-block mt-2 px-2 py-1 bg-[#22c55e]/20 text-[#22c55e] text-xs rounded">
                    Winner
                  </span>
                )}
              </button>

              {/* No */}
              <button
                onClick={() => setSelectedOutcome("No")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedOutcome === "No"
                    ? "border-[#ef4444] bg-[#ef4444]/10"
                    : "border-[#27272a] hover:border-[#3f3f46]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">No</span>
                  <TrendingDown className="w-4 h-4 text-[#ef4444]" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-[#ef4444]">
                  {formatPercent(prices.no)}
                </div>
                {noToken?.winner && (
                  <span className="inline-block mt-2 px-2 py-1 bg-[#ef4444]/20 text-[#ef4444] text-xs rounded">
                    Winner
                  </span>
                )}
              </button>
            </div>
          </motion.div>

          {/* Tabs: Chart / Order Book / Trades */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-[#16161a] rounded-xl border border-[#27272a] mb-4">
              {[
                { id: "chart" as const, label: "Price Chart", icon: BarChart3 },
                { id: "orderbook" as const, label: "Order Book", icon: TrendingUp },
                { id: "trades" as const, label: "Trades", icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${activeTab === tab.id
                        ? "bg-[#8b5cf6] text-white"
                        : "text-[#71717a] hover:text-white hover:bg-[#27272a]"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeTab === "chart" && (
              <>
                {selectedToken && selectedToken.token_id ? (
                  <PriceChart 
                    tokenId={selectedToken.token_id}
                    outcome={selectedOutcome}
                    height={350}
                  />
                ) : (
                  <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-[#71717a] mx-auto mb-4" />
                    <p className="text-[#a1a1aa]">
                      {!selectedToken ? "No token data available for this outcome" : "Price chart not available for this market"}
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === "orderbook" && (
              <>
                {selectedToken && selectedToken.token_id ? (
                  <LiveOrderBook 
                    tokenId={selectedToken.token_id}
                    maxLevels={10}
                  />
                ) : (
                  <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-[#71717a] mx-auto mb-4" />
                    <p className="text-[#a1a1aa]">
                      {!selectedToken ? "No token data available for this outcome" : "Order book not available for this market"}
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === "trades" && (
              <>
                {market.conditionId || market.condition_id ? (
                  <TradeHistory 
                    marketId={market.conditionId || market.condition_id || ''}
                    limit={20}
                  />
                ) : (
                  <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-[#71717a] mx-auto mb-4" />
                    <p className="text-[#a1a1aa]">Trade history not available for this market</p>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Positions & Orders Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PositionsPanel marketId={market.conditionId || market.condition_id} />
          </motion.div>
        </div>

        {/* Sidebar - Order Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {isActive ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <OrderForm market={market} selectedOutcome={selectedOutcome} />
              </motion.div>
            ) : (
              <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6 text-center">
                <h3 className="font-semibold mb-2">Trading Closed</h3>
                <p className="text-sm text-[#a1a1aa]">
                  This market is no longer accepting orders.
                </p>
              </div>
            )}

            {/* Links */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 bg-[#16161a] rounded-xl border border-[#27272a]"
            >
              <a
                href={`https://polymarket.com/event/${market.slug || market.market_slug || market.condition_id || market.conditionId || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-sm text-[#a1a1aa] hover:text-white transition-colors"
              >
                View on Polymarket
                <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
