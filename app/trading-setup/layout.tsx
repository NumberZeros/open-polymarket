import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Setup - Get Started",
  description: "Complete one-time setup to start trading. Deploy Safe wallet, approve tokens, and create API credentials.",
  openGraph: {
    title: "Trading Setup | BetHub",
    description: "Set up your account for trading",
    url: "https://polymarket.thosoft.xyz/trading-setup",
  },
};

export default function TradingSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
