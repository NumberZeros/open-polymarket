/**
 * Home Page - Markets Listing
 * 
 * Main page showing all prediction markets with filtering,
 * search, and sorting capabilities.
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { MarketFilters, defaultFilters, type MarketFiltersState, type MarketCategory } from "@/components/markets/MarketFilters";
import { MarketCard } from "@/components/markets/MarketCard";
import { getMarkets, getSamplingMarkets } from "@/lib/polymarket/marketApi";
import type { Market } from "@/lib/polymarket/types";
import { Loader2, TrendingUp, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";

// ============= Category Tags Mapping =============

const CATEGORY_TAGS: Record<MarketCategory, string[]> = {
  all: [],
  trending: [],
  "ending-soon": [],
  sports: ["sports", "nfl", "nba", "mlb", "soccer", "football", "basketball", "tennis", "ufc", "boxing", "f1"],
  entertainment: ["entertainment", "movies", "music", "tv", "celebrity", "awards", "oscars", "grammys"],
  politics: ["politics", "elections", "president", "congress", "senate", "government", "policy"],
  crypto: ["crypto", "bitcoin", "ethereum", "defi", "nft", "web3", "blockchain"],
  science: ["science", "technology", "space", "ai", "climate", "health"],
};

// ============= Component =============

export default function HomePage() {
  const [filters, setFilters] = useState<MarketFiltersState>(defaultFilters);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [featuredMarkets, setFeaturedMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch markets with retry logic
  const fetchMarkets = useCallback(async (retryCount = 0) => {
    setIsLoading(true);
    setError(null);

    try {
      const [allMarketsResult, featured] = await Promise.all([
        getMarkets({ limit: 100, closed: false }), // Only show active markets
        getSamplingMarkets().catch(() => []),
      ]);

      // Filter out closed markets
      const activeMarkets = (allMarketsResult.data || []).filter(m => !m.closed);
      const activeFeatured = featured.filter(m => !m.closed).slice(0, 6);
      
      setMarkets(activeMarkets);
      setFeaturedMarkets(activeFeatured);
    } catch (err) {
      console.error("[HomePage] Error fetching markets:", err);
      
      // Retry once after a delay if first attempt fails
      if (retryCount < 1) {
        console.log("[HomePage] Retrying market fetch...");
        setTimeout(() => fetchMarkets(retryCount + 1), 2000);
        return;
      }
      
      setError("Failed to load markets. Please try again.");
      toast.error("Failed to load markets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Filter and sort markets
  const filteredMarkets = useMemo(() => {
    // Start with active markets only
    let result = markets.filter(m => !m.closed);

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.question?.toLowerCase().includes(searchLower) ||
          m.description?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category !== "all") {
      if (filters.category === "trending") {
        // Sort by volume for trending
        result = result
          .filter((m) => parseFloat(m.volume || "0") > 10000)
          .sort((a, b) => parseFloat(b.volume || "0") - parseFloat(a.volume || "0"))
          .slice(0, 20);
      } else if (filters.category === "ending-soon") {
        // Filter by end date
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        result = result
          .filter((m) => {
            if (!m.end_date_iso) return false;
            const endDate = new Date(m.end_date_iso);
            return endDate > now && endDate < weekFromNow;
          })
          .sort((a, b) => {
            const dateA = new Date(a.end_date_iso || "").getTime();
            const dateB = new Date(b.end_date_iso || "").getTime();
            return dateA - dateB;
          });
      } else {
        // Filter by category tags
        const categoryTags = CATEGORY_TAGS[filters.category] || [];
        if (categoryTags.length > 0) {
          result = result.filter((m) => {
            const text = `${m.question || ""} ${m.description || ""}`.toLowerCase();
            return categoryTags.some((tag) => text.includes(tag));
          });
        }
      }
    }

    // Sort
    switch (filters.sort) {
      case "volume-desc":
        result.sort((a, b) => parseFloat(b.volume || "0") - parseFloat(a.volume || "0"));
        break;
      case "volume-asc":
        result.sort((a, b) => parseFloat(a.volume || "0") - parseFloat(b.volume || "0"));
        break;
      case "ending-soon":
        result.sort((a, b) => {
          const dateA = new Date(a.end_date_iso || "9999").getTime();
          const dateB = new Date(b.end_date_iso || "9999").getTime();
          return dateA - dateB;
        });
        break;
      case "newest":
        result.sort((a, b) => {
          const dateA = new Date(a.accepting_order_timestamp || "0").getTime();
          const dateB = new Date(b.accepting_order_timestamp || "0").getTime();
          return dateB - dateA;
        });
        break;
      case "price-yes-desc":
      case "price-yes-asc": {
        result.sort((a, b) => {
          const priceA = a.tokens?.[0]?.price || 0;
          const priceB = b.tokens?.[0]?.price || 0;
          return filters.sort === "price-yes-desc" ? priceB - priceA : priceA - priceB;
        });
        break;
      }
    }

    return result;
  }, [markets, filters]);

  // Show featured section only when not filtering
  const showFeatured = filters.category === "all" && !filters.search && filters.sort === "volume-desc";

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
            totalMarkets={filteredMarkets.length}
            isLoading={isLoading}
          />
        </motion.div>

        {/* Featured Markets */}
        <AnimatePresence>
          {showFeatured && featuredMarkets.length > 0 && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-10"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#f59e0b]" />
                <h2 className="text-xl font-bold">Featured</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredMarkets.map((market, index) => (
                  <motion.div
                    key={market.id || market.condition_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MarketCard market={market} />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Markets Grid */}
        <section>
          {/* Section Header */}
          {!showFeatured && (
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#8b5cf6]" />
              <h2 className="text-xl font-bold">
                {filters.category === "all"
                  ? "All Markets"
                  : filters.category === "trending"
                  ? "🔥 Trending"
                  : filters.category === "ending-soon"
                  ? "⏰ Ending Soon"
                  : `${filters.category.charAt(0).toUpperCase() + filters.category.slice(1)} Markets`}
              </h2>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin mb-4" />
              <p className="text-[#71717a]">Loading markets...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-12 h-12 text-[#ef4444] mb-4" />
              <p className="text-[#ef4444] mb-4">{error}</p>
              <button
                onClick={() => fetchMarkets()}
                className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] rounded-lg text-white hover:bg-[#7c3aed] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredMarkets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <TrendingUp className="w-12 h-12 text-[#71717a] mb-4" />
              <p className="text-[#a1a1aa] mb-2">No markets found</p>
              <p className="text-sm text-[#71717a]">
                Try adjusting your filters or search term
              </p>
            </div>
          )}

          {/* Markets Grid */}
          {!isLoading && !error && filteredMarkets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredMarkets.map((market, index) => (
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
