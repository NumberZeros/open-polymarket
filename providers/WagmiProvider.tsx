"use client";

import { ReactNode, useEffect, useState } from "react";
import { WagmiProvider as Wagmi } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";

// Create config - will only run on client due to "use client"
const config = getDefaultConfig({
  appName: "BetHub",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [polygon],
  ssr: true,
});

export default function WagmiProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Wagmi config={config}>
      <RainbowKitProvider>
        {mounted ? children : null}
      </RainbowKitProvider>
    </Wagmi>
  );
}