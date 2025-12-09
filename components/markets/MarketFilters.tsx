/**
 * Market Filters Component
 * 
 * Filter bar for markets with tabs, search, and sorting options.
 * Mobile-responsive with Gen Z friendly design.
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  TrendingUp,
  Clock,
  Flame,
  Trophy,
  Tv,
  Vote,
  Sparkles,
  ChevronDown,
  X,
  SlidersHorizontal,
} from "lucide-react";

// ============= Types =============

export type MarketCategory = 
  | "all" 
  | "trending" 
  | "ending-soon" 
  | "sports" 
  | "entertainment" 
  | "politics"
  | "crypto"
  | "science";

export type SortOption = 
  | "volume-desc" 
  | "volume-asc" 
  | "ending-soon" 
  | "newest" 
  | "price-yes-desc"
  | "price-yes-asc";

export interface MarketFiltersState {
  category: MarketCategory;
  sort: SortOption;
  search: string;
  tags: string[];
}

interface MarketFiltersProps {
  filters: MarketFiltersState;
  onFiltersChange: (filters: MarketFiltersState) => void;
  totalMarkets?: number;
  isLoading?: boolean;
}

// ============= Constants =============

const CATEGORIES: Array<{ id: MarketCategory; label: string; icon: React.ElementType; color: string }> = [
  { id: "all", label: "All", icon: Sparkles, color: "text-white" },
  { id: "trending", label: "Trending", icon: Flame, color: "text-orange-500" },
  { id: "ending-soon", label: "Ending Soon", icon: Clock, color: "text-yellow-500" },
  { id: "sports", label: "Sports", icon: Trophy, color: "text-green-500" },
  { id: "entertainment", label: "Entertainment", icon: Tv, color: "text-pink-500" },
  { id: "politics", label: "Politics", icon: Vote, color: "text-blue-500" },
  { id: "crypto", label: "Crypto", icon: TrendingUp, color: "text-purple-500" },
];

const SORT_OPTIONS: Array<{ id: SortOption; label: string }> = [
  { id: "volume-desc", label: "Highest Volume" },
  { id: "volume-asc", label: "Lowest Volume" },
  { id: "ending-soon", label: "Ending Soon" },
  { id: "newest", label: "Newest" },
  { id: "price-yes-desc", label: "Price: High to Low" },
  { id: "price-yes-asc", label: "Price: Low to High" },
];

// ============= Component =============

export function MarketFilters({
  filters,
  onFiltersChange,
  totalMarkets,
  isLoading,
}: MarketFiltersProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleCategoryChange = useCallback((category: MarketCategory) => {
    onFiltersChange({ ...filters, category });
  }, [filters, onFiltersChange]);

  const handleSortChange = useCallback((sort: SortOption) => {
    onFiltersChange({ ...filters, sort });
    setShowSortDropdown(false);
  }, [filters, onFiltersChange]);

  const handleSearchChange = useCallback((search: string) => {
    onFiltersChange({ ...filters, search });
  }, [filters, onFiltersChange]);

  const clearSearch = useCallback(() => {
    onFiltersChange({ ...filters, search: "" });
  }, [filters, onFiltersChange]);

  const currentSort = SORT_OPTIONS.find(s => s.id === filters.sort);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#71717a]" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search markets..."
          className="w-full pl-12 pr-10 py-3 bg-[#16161a] rounded-xl border border-[#27272a] text-white placeholder-[#71717a] focus:border-[#8b5cf6] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-colors"
        />
        {filters.search && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Category Tabs - Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-[#16161a] rounded-xl border border-[#27272a]">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = filters.category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? "text-white" 
                    : "text-[#71717a] hover:text-white hover:bg-[#27272a]/50"
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="category-bg"
                    className="absolute inset-0 bg-[#27272a] rounded-lg"
                    transition={{ type: "spring", duration: 0.3 }}
                  />
                )}
                <span className={`relative z-10 ${cat.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="relative z-10">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-[#16161a] rounded-lg border border-[#27272a] text-sm text-[#a1a1aa] hover:text-white hover:border-[#3f3f46] transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{currentSort?.label || "Sort"}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showSortDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 w-48 bg-[#16161a] rounded-xl border border-[#27272a] shadow-xl z-50 overflow-hidden"
              >
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSortChange(option.id)}
                    className={`
                      w-full px-4 py-3 text-left text-sm transition-colors
                      ${filters.sort === option.id 
                        ? "bg-[#8b5cf6]/10 text-[#8b5cf6]" 
                        : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Category Tabs - Mobile (Horizontal Scroll) */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-[#16161a] rounded-lg border border-[#27272a] text-sm text-[#a1a1aa]"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {(filters.category !== "all" || filters.sort !== "volume-desc") && (
              <span className="w-2 h-2 bg-[#8b5cf6] rounded-full" />
            )}
          </button>

          {totalMarkets !== undefined && (
            <span className="text-sm text-[#71717a]">
              {isLoading ? "Loading..." : `${totalMarkets} markets`}
            </span>
          )}
        </div>

        {/* Scrollable Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = filters.category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`
                  flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${isActive 
                    ? "bg-[#8b5cf6] text-white" 
                    : "bg-[#16161a] text-[#a1a1aa] border border-[#27272a]"
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : cat.color}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Filter Panel */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-3">
                <p className="text-sm font-medium text-[#a1a1aa]">Sort by</p>
                <div className="grid grid-cols-2 gap-2">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSortChange(option.id)}
                      className={`
                        px-3 py-2 rounded-lg text-sm text-left transition-colors
                        ${filters.sort === option.id 
                          ? "bg-[#8b5cf6] text-white" 
                          : "bg-[#16161a] text-[#a1a1aa] border border-[#27272a]"
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results count - Desktop */}
      {totalMarkets !== undefined && (
        <div className="hidden md:block text-sm text-[#71717a]">
          {isLoading ? "Loading markets..." : `Showing ${totalMarkets} markets`}
        </div>
      )}
    </div>
  );
}

// ============= Default Export =============

export const defaultFilters: MarketFiltersState = {
  category: "all",
  sort: "volume-desc",
  search: "",
  tags: [],
};
