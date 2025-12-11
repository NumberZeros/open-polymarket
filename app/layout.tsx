import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://polymarket.thosoft.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BetHub - Prediction Markets | Trade Crypto Events",
    template: "%s | BetHub",
  },
  description: "Trade prediction markets on real-world events. Powered by Polymarket CLOB API. Secure Safe wallets, easy onboarding, support indie developers.",
  keywords: ["prediction markets", "polymarket", "crypto", "trading", "DeFi", "Web3", "blockchain", "betting", "forecast"],
  authors: [{ name: "Thọ Nguyễn", url: "https://www.linkedin.com/in/th%E1%BB%8D-nguy%E1%BB%85n-941348360/" }],
  creator: "Thọ Nguyễn",
  publisher: "BetHub",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/assets/logo-icon.png", type: "image/png" },
    ],
    apple: "/assets/logo-icon.png",
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "BetHub",
    title: "BetHub - Modern Prediction Markets Trading",
    description: "Trade prediction markets with crypto. Secure, fast, and supporting indie developers.",
    images: [
      {
        url: "/assets/og-image.png",
        width: 1200,
        height: 630,
        alt: "BetHub - Prediction Markets Trading Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BetHub - Prediction Markets Trading",
    description: "Trade on real-world events with crypto. Powered by Polymarket.",
    images: ["/assets/og-image.png"],
    creator: "@BetHubApp",
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "Finance",
};

// JSON-LD Schema for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "BetHub",
  description: "Trade prediction markets on real-world events. Powered by Polymarket CLOB API.",
  url: siteUrl,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "Thọ Nguyễn",
    url: "https://www.linkedin.com/in/th%E1%BB%8D-nguy%E1%BB%85n-941348360/",
  },
  publisher: {
    "@type": "Organization",
    name: "BetHub",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/assets/logo-icon.png`,
    },
  },
  image: `${siteUrl}/assets/og-image.png`,
  screenshot: `${siteUrl}/assets/screenshot.png`,
  featureList: [
    "Prediction Markets Trading",
    "Real-time Market Data",
    "Secure Safe Wallet Integration",
    "Polymarket CLOB API",
    "Portfolio Tracking",
  ],
  browserRequirements: "Requires JavaScript. Requires Web3 wallet.",
  softwareVersion: "1.0.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0b] text-white min-h-screen`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
