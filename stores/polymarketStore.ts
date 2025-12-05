/**
 * Polymarket Store (Zustand)
 *
 * Manages Polymarket trading state and operations
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TradingStatus, Position, Order, OrderParams } from "@/lib/polymarket/types";
import { getSafeAddress, deploySafe } from "@/lib/polymarket/relayerApi";
import { deriveProxyWalletAddress } from "@/lib/polymarket/proxyWallet";
import {
  deriveApiKey,
  getOpenOrders,
  getPositions,
  getBalance,
  createOrder,
  cancelOrder,
  type TradingCredentials,
} from "@/lib/polymarket/tradingApi";

// ============= Types =============

interface PolymarketState {
  // Hydration
  _hasHydrated: boolean;

  // Connection
  address: string | null;
  isConnected: boolean;

  // Loading & Error
  isLoading: boolean;
  error: string | null;

  // Safe wallet
  safeAddress: string | null;
  hasApprovals: boolean;

  // Trading credentials
  credentials: TradingCredentials | null;

  // Balances & Positions
  eoaUsdcBalance: number;         // USDC in user's EOA wallet (MetaMask)
  proxyWalletUsdcBalance: number; // USDC in Proxy Wallet (Safe) - for trading
  positions: Position[];
  openOrders: Order[];
}

interface PolymarketActions {
  // Connection
  setWallet: (address: string | null) => void;
  
  // Initialize
  initialize: (address: string) => Promise<void>;
  reset: () => void;

  // Safe wallet
  deploySafeWallet: (
    signTypedData: (domain: object, types: object, value: object) => Promise<string>
  ) => Promise<boolean>;

  // Credentials - now uses signTypedData for EIP-712
  deriveCredentials: (
    signTypedData: (domain: object, types: object, value: object) => Promise<string>
  ) => Promise<boolean>;

  // Balances
  setEoaUsdcBalance: (balance: number) => void;
  refreshBalances: () => Promise<void>;

  // Trading
  placeOrder: (params: OrderParams) => Promise<{ success: boolean; error?: string }>;
  cancelUserOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;

  // Computed
  getStatus: () => TradingStatus;
}

type PolymarketStore = PolymarketState & PolymarketActions;

// ============= Initial State =============

const initialState: PolymarketState = {
  _hasHydrated: false,
  address: null,
  isConnected: false,
  isLoading: false,
  error: null,
  safeAddress: null,
  hasApprovals: false,
  credentials: null,
  eoaUsdcBalance: 0,
  proxyWalletUsdcBalance: 0,
  positions: [],
  openOrders: [],
};

// ============= Store =============

export const usePolymarketStore = create<PolymarketStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Set wallet address
      setWallet: (address) => {
        if (address) {
          set({ address, isConnected: true });
          get().initialize(address);
        } else {
          get().reset();
        }
      },

      // Initialize for wallet
      initialize: async (address) => {
        set({ isLoading: true, error: null });

        try {
          console.log("[Polymarket] Initializing for wallet:", address);
          
          // Derive the Proxy Wallet (Gnosis Safe) address from EOA
          // This is deterministic via CREATE2
          const proxyWalletAddress = deriveProxyWalletAddress(address);
          
          // Check if Safe is deployed via Relayer API
          const deployedSafeAddress = await getSafeAddress(address);
          
          // Set wallet as ready for trading
          // Note: safeAddress is the Proxy Wallet (Safe), not EOA
          // hasApprovals should be checked separately via depositService
          set({ 
            safeAddress: deployedSafeAddress || proxyWalletAddress,
            hasApprovals: !!deployedSafeAddress, // Only true if deployed
          });
          
          console.log("[Polymarket] Wallet initialized:", {
            eoa: address,
            proxyWallet: deployedSafeAddress || proxyWalletAddress,
            isDeployed: !!deployedSafeAddress,
          });
        } catch (err) {
          console.error("[Polymarket] Init failed:", err);
          set({ error: err instanceof Error ? err.message : "Failed to initialize" });
        } finally {
          set({ isLoading: false });
        }
      },

      // Reset state
      reset: () => {
        set({
          ...initialState,
          // Keep credentials in localStorage via persist
        });
      },

      // Deploy Safe wallet
      deploySafeWallet: async (signTypedData) => {
        const { address } = get();
        if (!address) {
          set({ error: "Wallet not connected" });
          return false;
        }

        set({ isLoading: true, error: null });

        try {
          const result = await deploySafe(address, signTypedData);

          if (result.success && result.safeAddress) {
            set({ safeAddress: result.safeAddress });
            return true;
          } else {
            set({ error: result.error || "Failed to deploy Safe" });
            return false;
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to deploy Safe" });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // Derive trading credentials using EIP-712 signature
      deriveCredentials: async (signTypedData) => {
        const { address } = get();
        if (!address) {
          set({ error: "Wallet not connected" });
          return false;
        }

        set({ isLoading: true, error: null });

        try {
          // deriveApiKey now handles both derive and create via proxy
          const creds = await deriveApiKey(address, signTypedData);
          set({ credentials: creds });
          return true;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to derive credentials" });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // Set EOA USDC balance (called from wagmi hook)
      setEoaUsdcBalance: (balance) => {
        set({ eoaUsdcBalance: balance });
      },

      // Refresh balances (Proxy Wallet balance from CLOB API)
      refreshBalances: async () => {
        const { safeAddress } = get();
        if (!safeAddress) return;

        set({ isLoading: true });

        try {
          const [balanceResult, positions, orders] = await Promise.all([
            getBalance(safeAddress),
            getPositions(safeAddress).catch(() => []),
            getOpenOrders(safeAddress).catch(() => []),
          ]);

          set({
            proxyWalletUsdcBalance: parseFloat(balanceResult.balance) || 0,
            positions,
            openOrders: orders,
          });
        } catch (err) {
          console.error("[Polymarket] Refresh failed:", err);
        } finally {
          set({ isLoading: false });
        }
      },

      // Place order
      placeOrder: async (params) => {
        const { safeAddress, refreshBalances } = get();
        if (!safeAddress) {
          return { success: false, error: "Not ready to trade" };
        }

        set({ isLoading: true, error: null });

        try {
          const result = await createOrder(safeAddress, params);
          if (!result.success) {
            throw new Error(result.error || "Failed to create order");
          }
          await refreshBalances();
          return { success: true };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Failed to place order";
          set({ error });
          return { success: false, error };
        } finally {
          set({ isLoading: false });
        }
      },

      // Cancel order
      cancelUserOrder: async (orderId) => {
        const { safeAddress, refreshBalances } = get();
        if (!safeAddress) {
          return { success: false, error: "Not authenticated" };
        }

        set({ isLoading: true, error: null });

        try {
          const result = await cancelOrder(safeAddress, orderId);
          if (!result.success) {
            throw new Error(result.error || "Failed to cancel order");
          }
          await refreshBalances();
          return { success: true };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Failed to cancel order";
          set({ error });
          return { success: false, error };
        } finally {
          set({ isLoading: false });
        }
      },

      // Get computed status
      getStatus: () => {
        const { address, isConnected, safeAddress, credentials } = get();
        return {
          isReady: !!safeAddress && !!credentials,
          hasWallet: isConnected && !!address,
          hasCreds: !!credentials,
          canTrade: !!safeAddress && !!credentials,
          canReadMarketData: true,
          isBuilder: true,
          builderMode: "server" as const,
          walletAddress: address || undefined,
          safeAddress: safeAddress || undefined,
          readOnlyMode: !credentials,
        };
      },
    }),
    {
      name: "polymarket-storage",
      storage: createJSONStorage(() => {
        // Return a no-op storage for SSR
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        // Persist credentials and safeAddress
        credentials: state.credentials,
        safeAddress: state.safeAddress,
        hasApprovals: state.hasApprovals,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
);

// ============= Hooks =============

// Hook to sync wallet with store
export function useSyncWallet(address: string | undefined, isConnected: boolean) {
  const setWallet = usePolymarketStore((state) => state.setWallet);
  const storeAddress = usePolymarketStore((state) => state.address);

  // Sync on change
  if (isConnected && address && address !== storeAddress) {
    setWallet(address);
  } else if (!isConnected && storeAddress) {
    setWallet(null);
  }
}

// Selector hooks for better performance
export const usePolymarketStatus = () => usePolymarketStore((state) => state.getStatus());
export const usePolymarketLoading = () => usePolymarketStore((state) => state.isLoading);
export const usePolymarketError = () => usePolymarketStore((state) => state.error);
export const useSafeAddress = () => usePolymarketStore((state) => state.safeAddress);
export const useHasApprovals = () => usePolymarketStore((state) => state.hasApprovals);
export const useCredentials = () => usePolymarketStore((state) => state.credentials);
export const useEoaUsdcBalance = () => usePolymarketStore((state) => state.eoaUsdcBalance);
export const useProxyWalletUsdcBalance = () => usePolymarketStore((state) => state.proxyWalletUsdcBalance);
export const usePositions = () => usePolymarketStore((state) => state.positions);
export const useOpenOrders = () => usePolymarketStore((state) => state.openOrders);
