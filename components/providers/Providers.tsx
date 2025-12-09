"use client";

/**
 * Client-side Providers Wrapper
 * 
 * Clean provider composition following official Polymarket patterns
 * Architecture: WagmiProvider → QueryProvider → WalletProvider → TradingProvider → App
 */

import AllProviders from "@/providers";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AllProviders>
      {children}
    </AllProviders>
  );
}
