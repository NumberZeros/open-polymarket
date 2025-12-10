/**
 * Home Page - Markets Listing
 * 
 * Main page showing all prediction markets with filtering,
 * search, and sorting capabilities.
 * 
 * Uses React Query for data fetching, caching, and automatic refetching.
 */

"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { MarketFilters, defaultFilters, type MarketFiltersState } from "@/components/markets/MarketFilters";
import { MarketCard } from "@/components/markets/MarketCard";
import { useInfiniteMarkets } from "@/hooks/useMarkets";
import { Loader2, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";

// ============= Component =============

export default function HomePage() {
  const [filters, setFilters] = useState<MarketFiltersState>(defaultFilters);

  // Use React Query for data fetching with caching
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteMarkets({
    category: filters.category,
    sort: filters.sort,
    search: filters.search,
  });

  // Flatten paginated data
  const markets = data?.pages.flatMap((page) => page) || [];

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById("scroll-sentinel");
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Toaster position="top-right" theme="dark" />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section */}
        <div className="mb-8 text-center md:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3"
          >
            Prediction Markets
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-[#a1a1aa] max-w-2xl"
          >
            Trade on real-world events. Put your knowledge to work.
          </motion.p>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <MarketFilters
            filters={filters}
            onFiltersChange={setFilters}
            totalMarkets={markets.length}
            isLoading={isLoading}
          />
        </motion.div>

        {/* Markets Grid */}
        <section>
          {/* Section Header */}
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#8b5cf6]" />
            <h2 className="text-xl font-bold">
              {filters.category === "all"
                ? "All Markets"
                : filters.category === "trending"
                ? "🔥 Trending"
                : filters.category === "ending-soon"
                ? "⏰ Ending Soon"
                : filters.category === "ended"
                ? "✅ Ended"
                : `${filters.category.charAt(0).toUpperCase() + filters.category.slice(1)} Markets`}
            </h2>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin mb-4" />
              <p className="text-[#71717a]">Loading markets...</p>
            </div>
          )}

          {/* Error State */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-12 h-12 text-[#ef4444] mb-4" />
              <p className="text-[#ef4444] mb-4">{error?.message || "Failed to load markets"}</p>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] rounded-lg text-white hover:bg-[#7c3aed] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && markets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <TrendingUp className="w-12 h-12 text-[#71717a] mb-4" />
              <p className="text-[#a1a1aa] mb-2">No markets found</p>
              <p className="text-sm text-[#71717a]">
                Try adjusting your filters or search term
              </p>
            </div>
          )}

          {/* Markets Grid */}
          {!isLoading && !isError && markets.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {markets.map((market, index) => (
                    <motion.div
                      key={market.id || market.condition_id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: Math.min(index * 0.02, 0.3) }}
                    >
                      <MarketCard market={market} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Infinite Scroll Sentinel */}
              <div id="scroll-sentinel" className="h-20 flex items-center justify-center">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-[#71717a]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}
                {!hasNextPage && markets.length > 0 && (
                  <p className="text-[#71717a] text-sm">No more markets to load</p>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[#71717a] text-sm">
              Powered by Polymarket Builder Program
            </p>
            <div className="flex gap-6 text-sm text-[#a1a1aa]">
              <a
                href="https://docs.polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Docs
              </a>
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Polymarket
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
