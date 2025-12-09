import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletContext";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { POLYMARKET_API } from "@/lib/polymarket/config";

const RELAYER_URL = POLYMARKET_API.RELAYER;
const POLYGON_CHAIN_ID = 137;

export default function useRelayClient() {
  const [relayClient, setRelayClient] = useState<RelayClient | null>(null);
  const { eoaAddress, ethersSigner } = useWallet();

  const initializeRelayClient = useCallback(async () => {
    if (!eoaAddress || !ethersSigner) {
      console.warn("[RelayClient] Wallet not ready yet", { 
        eoaAddress, 
        ethersSigner: !!ethersSigner 
      });
      return null;
    }

    try {
      // Builder config for remote signing
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: `${window.location.origin}/api/builder/sign`,
        },
      });

      const client = new RelayClient(
        RELAYER_URL,
        POLYGON_CHAIN_ID,
        ethersSigner,
        builderConfig
      );

      setRelayClient(client);
      return client;
    } catch (error) {
      console.error("Failed to initialize RelayClient:", error);
      throw error;
    }
  }, [eoaAddress, ethersSigner]);

  const clearRelayClient = useCallback(() => {
    setRelayClient(null);
  }, []);

  return {
    relayClient,
    initializeRelayClient,
    clearRelayClient,
  };
}