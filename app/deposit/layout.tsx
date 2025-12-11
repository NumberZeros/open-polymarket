import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deposit - Fund Your Account",
  description: "Deposit USDC.e to start trading prediction markets. Bridge from Ethereum, Solana, or transfer directly on Polygon.",
  openGraph: {
    title: "Deposit | BetHub",
    description: "Fund your trading account with USDC.e",
    url: "https://polymarket.thosoft.xyz/deposit",
  },
};

export default function DepositLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
