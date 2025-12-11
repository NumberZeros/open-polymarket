"use client";

import {
  useAccount,
  useDisconnect,
  useWalletClient,
  useConnect,
  useConnectors,
} from "wagmi";
import { providers } from "ethers";
import { createPublicClient, http } from "viem";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { WalletContext, WalletContextType } from "./WalletContext";
import { polygon } from "viem/chains";

const POLYGON_RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL),
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [ethersSigner, setEthersSigner] =
    useState<providers.JsonRpcSigner | null>(null);

  const { address: eoaAddress, isConnected: wagmiConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const { disconnectAsync } = useDisconnect();
  const { connectAsync } = useConnect();
  const connectors = useConnectors();

  // Convert viem WalletClient to ethers Signer (for Polymarket SDK compatibility)
  useEffect(() => {
    if (wagmiWalletClient) {
      try {
        const provider = new providers.Web3Provider(wagmiWalletClient as any);
        setEthersSigner(provider.getSigner());
      } catch (error) {
        console.error("Failed to create ethers signer:", error);
        setEthersSigner(null);
      }
    } else {
      setEthersSigner(null);
    }
  }, [wagmiWalletClient]);

  const connect = useCallback(async () => {
    try {
      // Find injected connector (MetaMask)
      const injectedConnector = connectors.find((c) => c.id === "injected");
      if (injectedConnector) {
        await connectAsync({ connector: injectedConnector });
      }
    } catch (error) {
      console.error("Connect error:", error);
    }
  }, [connectors, connectAsync]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectAsync();
      setEthersSigner(null);
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }, [disconnectAsync]);

  const value = useMemo<WalletContextType>(
    () => ({
      eoaAddress,
      walletClient: wagmiWalletClient || null,
      ethersSigner,
      publicClient,
      connect,
      disconnect,
      isConnected: wagmiConnected,
    }),
    [eoaAddress, wagmiWalletClient, ethersSigner, wagmiConnected, connect, disconnect]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}