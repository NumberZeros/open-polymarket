/**
 * React Query hooks for Polymarket Markets API
 * 
 * Provides cached, deduplicated API calls with automatic refetching
 */

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { getMarkets, searchMarkets } from "@/lib/polymarket/marketApi";

// ============= Query Keys =============

export const marketKeys = {
  all: ["markets"] as const,
  lists: () => [...marketKeys.all, "list"] as const,
  list: (filters: MarketFilters) => [
    ...marketKeys.lists(), 
    filters.category,
    filters.sort,
    filters.search || "",
  ] as const,
  details: () => [...marketKeys.all, "detail"] as const,
  detail: (id: string) => [...marketKeys.details(), id] as const,
};

// ============= Types =============

export interface MarketFilters {
  category: string;
  sort: string;
  search?: string;
  closed?: boolean;
  active?: boolean;
  end_date_min?: string;
  end_date_max?: string;
  volume_num_min?: number;
}

interface GetMarketsParams {
  limit?: number;
  offset?: number;
  closed?: boolean;
  active?: boolean;
  order?: string;
  ascending?: boolean;
  end_date_min?: string;
  end_date_max?: string;
  volume_num_min?: number;
}

// ============= Helper Functions =============

const buildSortParams = (sort: string) => ({
  order: sort.includes("volume") ? "volumeNum" : 
         sort === "ending-soon" ? "endDateIso" :
         sort === "newest" ? "id" : "volumeNum",
  ascending: sort.includes("asc") || sort === "ending-soon" ? true : false,
});

const buildTrendingParams = () => ({
  volume_num_min: 5000,
  order: "volumeNum" as const,
  ascending: false,
});

const buildEndingSoonParams = () => {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    end_date_min: now.toISOString(),
    end_date_max: weekFromNow.toISOString(),
    order: "endDateIso" as const,
    ascending: true,
  };
};

/**
 * Filter out invalid markets that cannot be traded
 * - closed: true
 * - active: false
 * - endDate in the past
 */
const isValidMarket = (market: any): boolean => {
  // Skip closed markets
  if (market.closed === true) return false;
  
  // Skip inactive markets
  if (market.active === false) return false;
  
  // Skip markets with endDate in the past
  if (market.endDateIso) {
    const endDate = new Date(market.endDateIso);
    const now = new Date();
    if (endDate < now) return false;
  }
  
  return true;
};

// ============= Hooks =============

/**
 * Fetch markets with filters and caching
 */
export function useMarkets(filters: MarketFilters) {
  const now = new Date();
  const sortParams = buildSortParams(filters.sort);

  // Build API params based on filters
  const apiParams: GetMarketsParams = {
    limit: 50,
    offset: 0,
    closed: filters.category === "ended" ? true : false,
    active: filters.category === "ended" ? false : true,
    ...sortParams,
  };

  // For active markets, only fetch those with endDate in the future
  if (filters.category !== "ended") {
    apiParams.end_date_min = now.toISOString();
  }

  // Apply category-specific params
  if (filters.category === "trending") {
    const trendingParams = buildTrendingParams();
    Object.assign(apiParams, trendingParams);
  } else if (filters.category === "ending-soon") {
    const endingSoonParams = buildEndingSoonParams();
    Object.assign(apiParams, endingSoonParams);
  } else if (filters.category === "ended") {
    apiParams.order = "endDateIso";
    apiParams.ascending = false;
  }

  return useQuery({
    queryKey: marketKeys.list(filters),
    queryFn: async () => {
      const result = await getMarkets(apiParams);
      let markets = result.data || [];

      // Filter out invalid markets
      markets = markets.filter(isValidMarket);

      // Client-side search filter if search term provided
      if (filters.search && filters.search.trim().length > 0) {
        const searchTerm = filters.search.trim().toLowerCase();
        markets = markets.filter(
          (m) =>
            m.question?.toLowerCase().includes(searchTerm) ||
            m.description?.toLowerCase().includes(searchTerm)
        );
      }

      return markets;
    },
    staleTime: 30 * 1000, // 30 seconds for market data
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Infinite query for paginated markets (load more)
 */
export function useInfiniteMarkets(filters: MarketFilters) {
  console.log("useInfiniteMarkets called with filters:", filters);
  
  // Determine if we should use search API or regular getMarkets API
  const tagCategories = ["crypto", "sports", "politics", "entertainment", "science"];
  const useSearchApi = tagCategories.includes(filters.category) || (filters.search && filters.search.trim().length > 0);
  
  return useInfiniteQuery({
    queryKey: [...marketKeys.list(filters), "infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      // Use search API for tag-based categories or when searching
      if (useSearchApi) {
        // When user searches, category is always "all", so just use search term
        // When user selects tag category without search, use only category name
        const query = filters.search || filters.category;

        const searchParams: any = {
          q: query,
          events_status: filters.category === "ended" ? "closed" : "active",
          limit_per_type: 50,
          page: pageParam ? Math.floor(pageParam / 50) + 1 : 1,
          keep_closed_markets: filters.category === "ended" ? 1 : 0,
        };

        // Add sort params if available
        if (filters.sort && filters.sort !== "volume-desc") {
          const sortParams = buildSortParams(filters.sort);
          searchParams.sort = sortParams.order;
          searchParams.ascending = sortParams.ascending;
        }

        console.log("Searching markets with params:", searchParams);
        const result = await searchMarkets(searchParams);
        
        // Extract markets from events and filter out invalid ones
        let markets = result.events?.flatMap(event => event.markets || []) || [];
        markets = markets.filter(isValidMarket);
        return markets;
      }

      // Use regular getMarkets API for other categories
      const now = new Date();
      const sortParams = buildSortParams(filters.sort);
      
      const apiParams: any = {
        limit: 50,
        offset: pageParam,
        closed: filters.category === "ended" ? true : false,
        active: filters.category === "ended" ? false : true,
        ...sortParams,
      };

      // For active markets, only fetch those with endDate in the future
      if (filters.category !== "ended") {
        apiParams.end_date_min = now.toISOString();
      }

      // Apply category-specific params
      if (filters.category === "trending") {
        Object.assign(apiParams, buildTrendingParams());
      } else if (filters.category === "ending-soon") {
        Object.assign(apiParams, buildEndingSoonParams());
      } else if (filters.category === "ended") {
        apiParams.order = "endDateIso";
        apiParams.ascending = false;
      }
      
      console.log("Fetching markets with params:", apiParams);
      const result = await getMarkets(apiParams);
      let markets = result.data || [];
      
      // Filter out invalid markets (closed, inactive, or expired)
      markets = markets.filter(isValidMarket);
      
      return markets;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined;
      return allPages.length * 50;
    },
    staleTime: 10 * 1000, // Shorter stale time - 10 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes cache
  });
}
