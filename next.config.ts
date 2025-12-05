import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Fix for WalletConnect pino-pretty warning
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
    };
    // Ignore pino-pretty in externals
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
