import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio - Track Your Positions",
  description: "View and manage your prediction market positions, open orders, and track your profit/loss in real-time on BetHub.",
  openGraph: {
    title: "Portfolio | BetHub",
    description: "Track your prediction market positions and P&L",
    url: "https://polymarket.thosoft.xyz/portfolio",
  },
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
