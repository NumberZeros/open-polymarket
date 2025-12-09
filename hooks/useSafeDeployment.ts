import { useCallback, useMemo } from "react";
import { useWallet } from "@/providers/WalletContext";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";

const POLYGON_CHAIN_ID = 137;

export default function useSafeDeployment() {
  const { eoaAddress } = useWallet();

  // Deterministically derive Safe address from EOA
  const derivedSafeAddressFromEoa = useMemo(() => {
    if (!eoaAddress) return null;

    try {
      const config = getContractConfig(POLYGON_CHAIN_ID);
      return deriveSafe(eoaAddress, config.SafeContracts.SafeFactory);
    } catch (error) {
      console.error("Failed to derive Safe address:", error);
      return null;
    }
  }, [eoaAddress]);

  // Check if Safe is deployed (via on-chain check as fallback)
  const isSafeDeployed = useCallback(async (
    relayClient: RelayClient,
    safeAddress: string
  ): Promise<boolean> => {
    try {
      const deployed = await relayClient.getDeployed(safeAddress);
      console.log(`[SafeDeployment] Safe ${safeAddress} deployed:`, deployed);
      return deployed;
    } catch (error) {
      console.error("[SafeDeployment] Failed to check via relayer, assuming deployed:", error);
      // If relayer check fails, assume Safe is deployed (user might already have one from Polymarket.com)
      return true;
    }
  }, []);

  // Deploy Safe wallet
  const deploySafe = useCallback(async (relayClient: RelayClient): Promise<void> => {
    try {
      console.log("[SafeDeployment] Deploying Safe wallet via builder relayer...");
      const response = await relayClient.deploy();
      const result = await response.wait();
      if (result?.proxyAddress) {
        console.log("[SafeDeployment] ✅ Safe deployed at:", result.proxyAddress);
      }
    } catch (error: any) {
      console.error("[SafeDeployment] ❌ Deployment failed:", error);
      
      // If it's a network error, provide helpful message
      if (error.message?.includes("request error") || error.message?.includes("ERR_NAME_NOT_RESOLVED")) {
        throw new Error(
          "Unable to connect to Polymarket relayer. Please check:\n" +
          "1. Your internet connection\n" +
          "2. VPN/Firewall settings\n" +
          "3. Try again later"
        );
      }
      
      throw error;
    }
  }, []);

  return {
    derivedSafeAddressFromEoa,
    isSafeDeployed,
    deploySafe,
  };
}