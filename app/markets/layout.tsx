import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Markets",
  description: "Browse and trade on prediction markets covering politics, sports, crypto, and more. Real-time odds powered by Polymarket.",
  openGraph: {
    title: "Markets | BetHub",
    description: "Browse prediction markets and place trades",
    url: "https://polymarket.thosoft.xyz/markets",
  },
};

export default function MarketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
