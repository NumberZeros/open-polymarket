import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Vercel deployment configuration */
  reactStrictMode: true,
  
  /* Performance optimization */
  compress: true,
  
  /* Image optimization for Vercel */
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.polymarket.com",
      },
      {
        protocol: "https",
        hostname: "polymarket-upload.s3.us-east-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
    ],
  },
  
  /* Webpack configuration */
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

  /* Headers for security and performance */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  /* Redirects */
  async redirects() {
    return [];
  },
};

export default nextConfig;
