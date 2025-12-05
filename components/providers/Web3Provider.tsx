"use client";

/**
 * Web3 Provider
 *
 * Wraps the app with wagmi and RainbowKit providers
 * Uses dynamic configuration to avoid SSR issues with WalletConnect/indexedDB
 */

import { WagmiProvider, createConfig, http } from "wagmi";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { polygon } from "wagmi/chains";
import { useState, useEffect, useMemo } from "react";

import "@rainbow-me/rainbowkit/styles.css";

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Create QueryClient only on client side
  const queryClient = useMemo(() => new QueryClient(), []);

  // Create wagmi config only on client side to avoid indexedDB SSR issues
  const config = useMemo(() => {
    if (typeof window === "undefined") return null;
    
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";
    
    return getDefaultConfig({
      appName: "BetHub - Prediction Markets",
      projectId,
      chains: [polygon],
      transports: {
        [polygon.id]: http(
          process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"
        ),
      },
      ssr: false, // Disable SSR for wagmi
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until client-side and config is ready
  if (!mounted || !config) {
    return (
      <div className="min-h-screen bg-[#0a0a0b]">
        {/* Loading placeholder */}
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#8b5cf6",
            accentColorForeground: "white",
            borderRadius: "medium",
            fontStack: "system",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
