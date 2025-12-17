/**
 * Hook for fetching builder trades using Polymarket CLOB Client
 * 
 * Retrieves all trades attributed to the builder account
 * Supports pagination with cursor-based navigation
 * 
 * @see https://docs.polymarket.com/developers/CLOB/clients/methods-builder#getbuildertrades
 */

import { useCallback, useState, useEffect } from 'react';
import { useTrading } from '@/providers/TradingProvider';

export interface TradeParams {
  id?: string;
  maker_address?: string;
  market?: string;
  asset_id?: string;
  before?: string;
  after?: string;
}

export interface BuilderTrade {
  id: string;
  tradeType: string;
  takerOrderHash: string;
  builder: string;
  market: string;
  assetId: string;
  side: string;
  size: string;
  sizeUsdc: string;
  price: string;
  status: string;
  outcome: string;
  outcomeIndex: number;
  owner: string;
  maker: string;
  transactionHash: string;
  matchTime: string;
  bucketIndex: number;
  fee: string;
  feeUsdc: string;
  err_msg?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BuilderTradesPaginatedResponse {
  trades: BuilderTrade[];
  next_cursor: string;
  limit: number;
  count: number;
}

export interface UseBuilderTradesState {
  trades: BuilderTrade[];
  isLoading: boolean;
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export default function useBuilderTrades() {
  const { clobClient, isTradingSessionComplete } = useTrading();
  
  const [state, setState] = useState<UseBuilderTradesState>({
    trades: [],
    isLoading: false,
    error: null,
    nextCursor: null,
    hasMore: false,
    totalCount: 0,
  });

  /**
   * Fetch builder trades with optional filtering and pagination
   */
  const fetchTrades = useCallback(
    async (params?: TradeParams) => {
      if (!clobClient) {
        setState((prev) => ({
          ...prev,
          error: 'CLOB Client not initialized',
          isLoading: false,
        }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log('[useBuilderTrades] Fetching builder trades with params:', params);

        // Check if clobClient has getBuilderTrades method
        if (!('getBuilderTrades' in clobClient)) {
          throw new Error(
            'getBuilderTrades method not available. Builder credentials may not be configured.'
          );
        }

        // Call the getBuilderTrades method
        const response = await (clobClient as any).getBuilderTrades(params);

        console.log('[useBuilderTrades] ✅ Received response:', {
          tradeCount: response.trades.length,
          nextCursor: response.next_cursor,
          limit: response.limit,
          count: response.count,
        });

        setState({
          trades: response.trades,
          isLoading: false,
          error: null,
          nextCursor: response.next_cursor || null,
          hasMore: !!response.next_cursor,
          totalCount: response.count,
        });

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch builder trades';
        console.error('[useBuilderTrades] ❌ Error:', errorMessage);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [clobClient]
  );

  /**
   * Fetch next page of trades
   */
  const fetchNext = useCallback(async () => {
    if (!state.nextCursor) {
      console.warn('[useBuilderTrades] No next cursor available');
      return;
    }

    const response = await fetchTrades({ after: state.nextCursor });
    if (response) {
      setState((prev) => ({
        ...prev,
        trades: [...prev.trades, ...response.trades],
        nextCursor: response.next_cursor || null,
        hasMore: !!response.next_cursor,
      }));
    }
  }, [state.nextCursor, fetchTrades]);

  /**
   * Fetch previous page of trades
   */
  const fetchPrevious = useCallback(async (cursor: string) => {
    const response = await fetchTrades({ before: cursor });
    if (response) {
      setState({
        trades: response.trades,
        isLoading: false,
        error: null,
        nextCursor: response.next_cursor || null,
        hasMore: !!response.next_cursor,
        totalCount: response.count,
      });
    }
  }, [fetchTrades]);

  /**
   * Reset trades data
   */
  const reset = useCallback(() => {
    setState({
      trades: [],
      isLoading: false,
      error: null,
      nextCursor: null,
      hasMore: false,
      totalCount: 0,
    });
  }, []);

  /**
   * Auto-fetch trades when client becomes available
   */
  useEffect(() => {
    if (clobClient && isTradingSessionComplete && state.trades.length === 0 && !state.isLoading) {
      fetchTrades();
    }
  }, [clobClient, isTradingSessionComplete, state.trades.length, state.isLoading, fetchTrades]);

  return {
    ...state,
    fetchTrades,
    fetchNext,
    fetchPrevious,
    reset,
  };
}
