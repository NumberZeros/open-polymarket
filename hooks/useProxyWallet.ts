/**
 * Proxy Wallet Hook
 * 
 * Reusable hook for fetching and managing proxy wallet information
 */

import { useState, useCallback, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
  deriveProxyWalletAddress,
  isProxyWalletDeployed,
  getProxyWalletUsdcBalance,
} from "@/lib/polymarket/proxyWallet";

interface UseProxyWalletReturn {
  proxyWalletAddress: string | null;
  proxyWalletDeployed: boolean | null;
  proxyWalletBalance: bigint | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProxyWallet(): UseProxyWalletReturn {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [proxyWalletAddress, setProxyWalletAddress] = useState<string | null>(null);
  const [proxyWalletDeployed, setProxyWalletDeployed] = useState<boolean | null>(null);
  const [proxyWalletBalance, setProxyWalletBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProxyWalletInfo = useCallback(async () => {
    if (!address || !publicClient) {
      setProxyWalletAddress(null);
      setProxyWalletDeployed(null);
      setProxyWalletBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const proxyAddr = deriveProxyWalletAddress(address);
      setProxyWalletAddress(proxyAddr);

      const deployed = await isProxyWalletDeployed(proxyAddr, publicClient);
      setProxyWalletDeployed(deployed);

      if (deployed) {
        const balance = await getProxyWalletUsdcBalance(proxyAddr, publicClient);
        setProxyWalletBalance(balance);
      } else {
        setProxyWalletBalance(BigInt(0));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch proxy wallet info";
      setError(errorMessage);
      setProxyWalletDeployed(null);
      setProxyWalletBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchProxyWalletInfo();
  }, [fetchProxyWalletInfo]);

  return {
    proxyWalletAddress,
    proxyWalletDeployed,
    proxyWalletBalance,
    isLoading,
    error,
    refetch: fetchProxyWalletInfo,
  };
}
