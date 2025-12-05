/**
 * Wagmi & RainbowKit Configuration
 *
 * Setup for wallet connection with Polygon network
 */

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon } from "wagmi/chains";
import { http } from "wagmi";

// Get project ID from environment or use a default for development
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

export const config = getDefaultConfig({
  appName: "BetHub - Prediction Markets",
  projectId,
  chains: [polygon],
  transports: {
    [polygon.id]: http(
      process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"
    ),
  },
  ssr: true,
});

// Re-export chain for convenience
export { polygon };
