"use client";

/**
 * Market Detail Client Component
 *
 * Interactive market view with trading functionality
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { OrderForm } from "@/components/trading/OrderForm";
import { 
  getOrderBook, 
  calculateMarketPrice, 
  parseOutcomePrices,
  formatPercent,
} from "@/lib/polymarket/marketApi";
import type { Market, OrderBook } from "@/lib/polymarket/types";
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  TrendingUp, 
  ExternalLink,
  BarChart3,
  Loader2 
} from "lucide-react";

interface MarketDetailClientProps {
  market: Market;
}

export function MarketDetailClient({ market }: MarketDetailClientProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<"Yes" | "No">("Yes");
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [isLoadingBook, setIsLoadingBook] = useState(true);

  const prices = parseOutcomePrices(market);
  const yesToken = market.tokens.find((t) => t.outcome === "Yes");
  const noToken = market.tokens.find((t) => t.outcome === "No");

  // Load order book
  useEffect(() => {
    const loadOrderBook = async () => {
      const token = selectedOutcome === "Yes" ? yesToken : noToken;
      if (!token) return;

      setIsLoadingBook(true);
      try {
        const book = await getOrderBook(token.token_id);
        setOrderBook(book);
      } catch (err) {
        console.error("Failed to load order book:", err);
      } finally {
        setIsLoadingBook(false);
      }
    };

    loadOrderBook();
  }, [selectedOutcome, yesToken, noToken]);

  const marketPrice = orderBook ? calculateMarketPrice(orderBook) : null;
  const endDate = market.end_date_iso ? new Date(market.end_date_iso) : null;
  const isActive = market.active && !market.closed;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[#a1a1aa] hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Header */}
          <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
            {/* Image */}
            {market.image && (
              <div className="relative h-48 -mx-6 -mt-6 mb-6 overflow-hidden rounded-t-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={market.image}
                  alt={market.question}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#16161a] to-transparent" />
              </div>
            )}

            {/* Question */}
            <h1 className="text-2xl md:text-3xl font-bold mb-4">
              {market.question}
            </h1>

            {/* Description */}
            {market.description && (
              <p className="text-[#a1a1aa] mb-6">{market.description}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm text-[#71717a]">
              {market.volume && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>Volume: ${parseFloat(market.volume).toLocaleString()}</span>
                </div>
              )}
              {endDate && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {endDate > new Date()
                      ? `Ends ${endDate.toLocaleDateString()}`
                      : `Ended ${endDate.toLocaleDateString()}`}
                  </span>
                </div>
              )}
              {!isActive && (
                <span className="px-2 py-1 bg-[#27272a] rounded-full">
                  {market.closed ? "Closed" : "Inactive"}
                </span>
              )}
            </div>
          </div>

          {/* Outcome Selection */}
          <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
            <h2 className="font-semibold mb-4">Select Outcome</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Yes */}
              <button
                onClick={() => setSelectedOutcome("Yes")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedOutcome === "Yes"
                    ? "border-[#22c55e] bg-[#22c55e]/10"
                    : "border-[#27272a] hover:border-[#3f3f46]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Yes</span>
                  <TrendingUp className="w-4 h-4 text-[#22c55e]" />
                </div>
                <div className="text-2xl font-bold text-[#22c55e]">
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
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedOutcome === "No"
                    ? "border-[#ef4444] bg-[#ef4444]/10"
                    : "border-[#27272a] hover:border-[#3f3f46]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">No</span>
                  <TrendingUp className="w-4 h-4 text-[#ef4444] rotate-180" />
                </div>
                <div className="text-2xl font-bold text-[#ef4444]">
                  {formatPercent(prices.no)}
                </div>
                {noToken?.winner && (
                  <span className="inline-block mt-2 px-2 py-1 bg-[#ef4444]/20 text-[#ef4444] text-xs rounded">
                    Winner
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Order Book */}
          <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Order Book ({selectedOutcome})
              </h2>
              {marketPrice && (
                <span className="text-sm text-[#a1a1aa]">
                  Mid: ${marketPrice.midPrice.toFixed(3)}
                </span>
              )}
            </div>

            {isLoadingBook ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#8b5cf6]" />
              </div>
            ) : orderBook ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Bids */}
                <div>
                  <h3 className="text-sm text-[#22c55e] mb-2">Bids</h3>
                  <div className="space-y-1">
                    {orderBook.bids.slice(0, 5).map((level, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm bg-[#22c55e]/5 px-2 py-1 rounded"
                      >
                        <span>${parseFloat(level.price).toFixed(3)}</span>
                        <span className="text-[#a1a1aa]">
                          {parseFloat(level.size).toFixed(0)}
                        </span>
                      </div>
                    ))}
                    {orderBook.bids.length === 0 && (
                      <p className="text-sm text-[#71717a]">No bids</p>
                    )}
                  </div>
                </div>

                {/* Asks */}
                <div>
                  <h3 className="text-sm text-[#ef4444] mb-2">Asks</h3>
                  <div className="space-y-1">
                    {orderBook.asks.slice(0, 5).map((level, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm bg-[#ef4444]/5 px-2 py-1 rounded"
                      >
                        <span>${parseFloat(level.price).toFixed(3)}</span>
                        <span className="text-[#a1a1aa]">
                          {parseFloat(level.size).toFixed(0)}
                        </span>
                      </div>
                    ))}
                    {orderBook.asks.length === 0 && (
                      <p className="text-sm text-[#71717a]">No asks</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[#71717a] text-center py-4">
                Failed to load order book
              </p>
            )}
          </div>
        </div>

        {/* Sidebar - Order Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {isActive ? (
              <OrderForm market={market} selectedOutcome={selectedOutcome} />
            ) : (
              <div className="bg-[#16161a] rounded-xl border border-[#27272a] p-6 text-center">
                <h3 className="font-semibold mb-2">Trading Closed</h3>
                <p className="text-sm text-[#a1a1aa]">
                  This market is no longer accepting orders.
                </p>
              </div>
            )}

            {/* Links */}
            <div className="mt-4 p-4 bg-[#16161a] rounded-xl border border-[#27272a]">
              <a
                href={`https://polymarket.com/event/${market.market_slug || market.condition_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-sm text-[#a1a1aa] hover:text-white transition-colors"
              >
                View on Polymarket
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
