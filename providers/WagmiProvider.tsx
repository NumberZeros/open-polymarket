"use client";

import { ReactNode } from "react";
import dynamic from "next/dynamic";
import { WagmiProvider as Wagmi, createConfig } from "wagmi";
import { polygon } from "wagmi/chains";

const RainbowKitProvider = dynamic(
  () => import("@rainbow-me/rainbowkit").then((mod) => mod.RainbowKitProvider),
  { ssr: false }
);

const rainbowKitStyles = dynamic(
  () => import("@rainbow-me/rainbowkit/styles.css"),
  { ssr: false }
);

const { getDefaultConfig } = require("@rainbow-me/rainbowkit");

const POLYGON_RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

// Only create config on client side
let config: any = null;

export default function WagmiProvider({ children }: { children: ReactNode }) {
  // Ensure config is only created on client
  if (typeof window !== "undefined" && !config) {
    config = getDefaultConfig({
      appName: "BetHub",
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
      chains: [polygon],
      ssr: false,
    });
  }

  if (!config) {
    return <>{children}</>;
  }

  return (
    <Wagmi config={config}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </Wagmi>
  );
}