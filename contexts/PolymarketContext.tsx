"use client";

/**
 * Polymarket Context & Provider
 *
 * Manages Polymarket trading state and operations
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAccount, useSignMessage, useSignTypedData } from "wagmi";
import type { TradingStatus, Position, Order } from "@/lib/polymarket/types";
import {
  getSafeAddress,
  deploySafe,
  setupTradingApprovals,
} from "@/lib/polymarket/relayerApi";
import {
  deriveApiKey,
  createApiKey,
  getOpenOrders,
  getPositions,
  getBalance,
  createOrder,
  cancelOrder,
  type TradingCredentials,
} from "@/lib/polymarket/tradingApi";
import type { OrderParams } from "@/lib/polymarket/types";

// ============= Types =============

interface PolymarketContextValue {
  // Status
  status: TradingStatus;
  isLoading: boolean;
  error: string | null;

  // Safe wallet
  safeAddress: string | null;
  deploySafeWallet: () => Promise<boolean>;
  setupApprovals: () => Promise<boolean>;

  // Trading credentials
  credentials: TradingCredentials | null;
  deriveCredentials: () => Promise<boolean>;

  // Balances & Positions
  usdcBalance: number;
  positions: Position[];
  openOrders: Order[];
  refreshBalances: () => Promise<void>;

  // Trading
  placeOrder: (params: OrderParams) => Promise<{ success: boolean; error?: string }>;
  cancelUserOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
}

const PolymarketContext = createContext<PolymarketContextValue | null>(null);

// ============= Provider =============

interface PolymarketProviderProps {
  children: ReactNode;
}

export function PolymarketProvider({ children }: PolymarketProviderProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<TradingCredentials | null>(null);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);

  // Computed status
  const status: TradingStatus = {
    isReady: !!safeAddress && !!credentials,
    hasWallet: isConnected && !!address,
    hasCreds: !!credentials,
    canTrade: !!safeAddress && !!credentials,
    canReadMarketData: true,
    isBuilder: true,
    builderMode: "server",
    walletAddress: address,
    safeAddress: safeAddress || undefined,
    readOnlyMode: !credentials,
  };

  // Initialize on wallet connection
  useEffect(() => {
    if (address) {
      initializeForWallet(address);
    } else {
      // Reset state on disconnect
      setSafeAddress(null);
      setCredentials(null);
      setUsdcBalance(0);
      setPositions([]);
      setOpenOrders([]);
    }
  }, [address]);

  const initializeForWallet = async (walletAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for existing Safe
      const safe = await getSafeAddress(walletAddress);
      setSafeAddress(safe);

      // Try to load saved credentials from localStorage
      const savedCreds = localStorage.getItem(`poly_creds_${walletAddress}`);
      if (savedCreds) {
        try {
          const parsed = JSON.parse(savedCreds);
          setCredentials(parsed);
        } catch {
          localStorage.removeItem(`poly_creds_${walletAddress}`);
        }
      }
    } catch (err) {
      console.error("[Polymarket] Init failed:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize");
    } finally {
      setIsLoading(false);
    }
  };

  // Deploy Safe wallet
  const deploySafeWallet = useCallback(async (): Promise<boolean> => {
    if (!address) {
      setError("Wallet not connected");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await deploySafe(address, async (domain, types, value) => {
        return signTypedDataAsync({
          domain: domain as any,
          types: types as any,
          primaryType: "SafeTx",
          message: value as any,
        });
      });

      if (result.success && result.safeAddress) {
        setSafeAddress(result.safeAddress);
        return true;
      } else {
        setError(result.error || "Failed to deploy Safe");
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deploy Safe");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, signTypedDataAsync]);

  // Setup trading approvals
  const setupApprovals = useCallback(async (): Promise<boolean> => {
    if (!address || !safeAddress) {
      setError("Safe wallet not deployed");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await setupTradingApprovals(
        address,
        safeAddress,
        async (domain, types, value) => {
          return signTypedDataAsync({
            domain: domain as any,
            types: types as any,
            primaryType: "SafeTx",
            message: value as any,
          });
        }
      );

      if (result.success) {
        return true;
      } else {
        setError(result.error || "Failed to setup approvals");
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to setup approvals");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, safeAddress, signTypedDataAsync]);

  // Derive trading credentials
  const deriveCredentials = useCallback(async (): Promise<boolean> => {
    if (!address) {
      setError("Wallet not connected");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to derive first, then create if that fails
      let creds: TradingCredentials;
      try {
        creds = await deriveApiKey(address, async (msg) => {
          return signMessageAsync({ message: msg });
        });
      } catch {
        creds = await createApiKey(address, async (msg) => {
          return signMessageAsync({ message: msg });
        });
      }

      setCredentials(creds);
      // Save to localStorage
      localStorage.setItem(`poly_creds_${address}`, JSON.stringify(creds));
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to derive credentials"
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, signMessageAsync]);

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (!address || !credentials) return;

    try {
      const [balanceRes, positionsRes, ordersRes] = await Promise.allSettled([
        getBalance(address),
        getPositions(address),
        getOpenOrders(address),
      ]);

      if (balanceRes.status === "fulfilled") {
        setUsdcBalance(parseFloat(balanceRes.value.balance || "0"));
      }
      if (positionsRes.status === "fulfilled") {
        setPositions(positionsRes.value);
      }
      if (ordersRes.status === "fulfilled") {
        setOpenOrders(ordersRes.value);
      }
    } catch (err) {
      console.error("[Polymarket] Failed to refresh balances:", err);
    }
  }, [address, credentials]);

  // Place order
  const placeOrder = useCallback(
    async (params: OrderParams): Promise<{ success: boolean; error?: string }> => {
      if (!address) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        const result = await createOrder(address, params);
        if (result.success) {
          // Refresh balances after successful order
          await refreshBalances();
        }
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to place order",
        };
      }
    },
    [address, refreshBalances]
  );

  // Cancel order
  const cancelUserOrder = useCallback(
    async (orderId: string): Promise<{ success: boolean; error?: string }> => {
      if (!address) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        const result = await cancelOrder(address, orderId);
        if (result.success) {
          await refreshBalances();
        }
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to cancel order",
        };
      }
    },
    [address, refreshBalances]
  );

  const value: PolymarketContextValue = {
    status,
    isLoading,
    error,
    safeAddress,
    deploySafeWallet,
    setupApprovals,
    credentials,
    deriveCredentials,
    usdcBalance,
    positions,
    openOrders,
    refreshBalances,
    placeOrder,
    cancelUserOrder,
  };

  return (
    <PolymarketContext.Provider value={value}>
      {children}
    </PolymarketContext.Provider>
  );
}

// ============= Hook =============

export function usePolymarket() {
  const context = useContext(PolymarketContext);
  if (!context) {
    throw new Error("usePolymarket must be used within PolymarketProvider");
  }
  return context;
}
