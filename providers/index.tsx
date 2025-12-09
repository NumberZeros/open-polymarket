"use client";

import { ReactNode } from "react";
import QueryProvider from "./QueryProvider";
import WagmiProvider from "./WagmiProvider";
import { WalletProvider } from "./WalletProvider";
import TradingProvider from "./TradingProvider";

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <WagmiProvider>
        <WalletProvider>
          <TradingProvider>{children}</TradingProvider>
        </WalletProvider>
      </WagmiProvider>
    </QueryProvider>
  );
}

export default Providers;
export { Providers as AllProviders };