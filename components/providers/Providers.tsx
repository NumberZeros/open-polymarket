"use client";

/**
 * Client-side Providers Wrapper
 * 
 * This component wraps all providers that need client-side only rendering
 * Note: State management is now handled by Zustand (stores/polymarketStore.ts)
 */

import dynamic from "next/dynamic";

// Dynamic import Web3Provider to avoid SSR issues with WalletConnect/indexedDB
const Web3Provider = dynamic(
  () => import("./Web3Provider").then((mod) => mod.Web3Provider),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#0a0a0b]">
        {/* Loading placeholder */}
      </div>
    ),
  }
);

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Web3Provider>
      {children}
    </Web3Provider>
  );
}
