"use client";

import { ReactNode } from "react";
import { WagmiProvider as Wagmi, createConfig } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";

const POLYGON_RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

const config = getDefaultConfig({
  appName: "BetHub",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [polygon],
  ssr: false,
});

export default function WagmiProvider({ children }: { children: ReactNode }) {
  return (
    <Wagmi config={config}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </Wagmi>
  );
}