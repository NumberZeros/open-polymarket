import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { POLYGON_CONTRACTS } from "@/lib/polymarket/config";
import { erc20Abi } from "viem";

/**
 * Hook to fetch Safe (Proxy Wallet) USDC balance
 * 
 * Uses viem publicClient to read USDC.e balance on-chain
 */
export default function useSafeBalance(safeAddress: string | undefined) {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!safeAddress || !publicClient) {
      setBalance(0);
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      try {
        const balanceWei = await publicClient.readContract({
          address: POLYGON_CONTRACTS.USDC as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [safeAddress as `0x${string}`],
        });

        // Convert from 6 decimals to float
        const balanceUsdc = Number(balanceWei) / 1e6;
        setBalance(balanceUsdc);
      } catch (error) {
        console.error("[useSafeBalance] Failed to fetch balance:", error);
        setBalance(0);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchBalance();

    // Poll every 30 seconds
    const interval = setInterval(fetchBalance, 30000);

    return () => clearInterval(interval);
  }, [safeAddress, publicClient]);

  return { balance, isLoading };
}
